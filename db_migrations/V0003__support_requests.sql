CREATE TABLE t_p51402717_auto_management_app.support_requests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120),
  contact VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);