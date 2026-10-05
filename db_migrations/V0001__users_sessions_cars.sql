CREATE TABLE t_p51402717_auto_management_app.users (
  id SERIAL PRIMARY KEY,
  login VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  consent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE t_p51402717_auto_management_app.sessions (
  token VARCHAR(64) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p51402717_auto_management_app.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE t_p51402717_auto_management_app.cars (
  id VARCHAR(64) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES t_p51402717_auto_management_app.users(id),
  make VARCHAR(255),
  plate VARCHAR(32),
  vin VARCHAR(32),
  year VARCHAR(8),
  mileage INTEGER,
  data JSONB NOT NULL,
  archived_at TIMESTAMP,
  removed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX idx_cars_make ON t_p51402717_auto_management_app.cars (make);
CREATE INDEX idx_cars_vin ON t_p51402717_auto_management_app.cars (vin);
CREATE INDEX idx_sessions_user ON t_p51402717_auto_management_app.sessions (user_id);