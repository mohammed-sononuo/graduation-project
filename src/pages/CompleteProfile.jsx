import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import { useAuth } from "../context/AuthContext";

function CompleteProfile() {
  const navigate = useNavigate();
  const { setUserAndToken } = useAuth();
  const [colleges, setColleges] = useState([]);
  const [majors, setMajors] = useState([]);
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    student_number: "",
    collegeId: "",
    college: "",
    major: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!user.must_complete_profile) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (user.name) {
      const parts = user.name.trim().split(/\s+/);
      setForm((prev) => ({
        ...prev,
        first_name: parts[0] || prev.first_name,
        last_name: parts.length > 1 ? parts.slice(1).join(" ") : prev.last_name,
      }));
    }
  }, [user, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    Promise.all([
      fetch(apiUrl("/api/colleges"), { headers }).then((r) => r.json()),
      fetch(apiUrl("/api/majors"), { headers }).then((r) => r.json()),
    ])
      .then(([c, m]) => {
        setColleges(Array.isArray(c) ? c : []);
        setMajors(Array.isArray(m) ? m : []);
      })
      .catch(() => {});
  }, []);

  const availableMajors = form.collegeId
    ? majors.filter((m) => String(m.collegeId) === String(form.collegeId)).map((m) => m.name)
    : [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "collegeId") {
        next.major = "";
        next.college = colleges.find((c) => String(c.id) === String(value))?.name ?? "";
      }
      return next;
    });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.first_name?.trim() || !form.last_name?.trim() || !form.student_number?.trim()) {
      setError("First name, last name, and student number are required.");
      return;
    }
    if (!form.password) {
      setError("Please choose a password.");
      return;
    }
    if (form.password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl("/api/auth/complete-profile"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          email: user.email,
          first_name: form.first_name.trim(),
          middle_name: form.middle_name.trim() || undefined,
          last_name: form.last_name.trim(),
          student_number: form.student_number.trim(),
          college: form.college || (form.collegeId ? colleges.find((c) => String(c.id) === String(form.collegeId))?.name : undefined) || undefined,
          major: form.major || undefined,
          phone: form.phone.trim() || undefined,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save profile.");
        return;
      }
      if (data.user) {
        const token = localStorage.getItem("token");
        setUserAndToken(data.user, token || null);
        navigate("/dashboard", { replace: true });
      }
    } catch {
      setError("Could not save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user || !user.must_complete_profile) return null;

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-8 md:p-10">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-blue-900 text-center mb-1">Complete your profile</h1>
          <p className="text-gray-500 text-sm text-center mb-8">
            You signed in with Google. Enter your university details and choose a password to finish registration.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Middle name</label>
              <input
                name="middle_name"
                value={form.middle_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Middle name (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student number *</label>
              <input
                name="student_number"
                value={form.student_number}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 12210123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
              <select
                name="collegeId"
                value={form.collegeId}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select college…</option>
                {colleges.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic program</label>
              <select
                name="major"
                value={form.major}
                onChange={handleChange}
                disabled={!form.college}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
              >
                <option value="">Select program…</option>
                {availableMajors.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+970 59 xxx xxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="At least 4 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password *</label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                minLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Repeat your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
            >
              {loading ? "Saving…" : "Save and continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CompleteProfile;
