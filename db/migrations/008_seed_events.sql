-- Seed initial events (from former static events.js).
INSERT INTO events (id, title, description, category, image, location, start_date, start_time, available_seats, price, price_member, featured, status) VALUES
  ('symp-2024', 'Symposium on Global Innovation 2024',
   'A full-day symposium bringing together scholars and industry leaders to discuss research, innovation, and the future of technology.',
   'Symposium', '/event1.jpg', 'Main Auditorium, Yata Building', '2024-10-12', '9:00 AM', 200, 25, 15, true, 'upcoming'),
  ('future-projects', 'AI in Higher Ed: Future Prospects',
   'A focused session on how universities can responsibly adopt AI for teaching, learning, and administration.',
   'Technology', '/event2.jpg', 'Innovation Lab, New Campus', '2024-10-24', '10:00 AM', 80, 0, 0, false, 'upcoming'),
  ('leadership-retreat', 'Annual Leadership Retreat 2024',
   'A retreat designed for student leaders to strengthen collaboration, communication, and campus impact.',
   'Community', '/event3.jpg', 'Student Affairs Center', '2024-10-28', '2:00 PM', 50, 0, 0, false, 'upcoming'),
  ('bio-genomics', 'Bio-Genomics Workshop',
   'Hands-on workshop introducing modern genomic analysis methods with practical case studies and tools.',
   'Science & Medicine', '/event4.jpg', 'Science Hall, Room 204', '2024-09-18', '11:00 AM', 30, 0, 0, false, 'past'),
  ('digital-transformation', 'Digital Transformation Summit',
   'A summit exploring digital strategy, data governance, and implementation frameworks in higher education.',
   'Research', '/event1.jpg', 'Conference Center, Old Campus', '2024-08-07', '9:30 AM', 150, 0, 0, false, 'past'),
  ('careers-networking', 'Alumni Networking Night',
   'Meet alumni across industries, learn about career paths, and expand your professional network.',
   'Career Development', '/event2.jpg', 'Graduate Lounge', '2024-07-20', '6:00 PM', 60, 0, 0, false, 'past')
ON CONFLICT (id) DO NOTHING;
