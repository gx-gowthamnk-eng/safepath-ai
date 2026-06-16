-- SafePath AI PostgreSQL/Supabase Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS sos_events CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS deviations CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin'
    mode VARCHAR(50) DEFAULT 'standard', -- 'standard', 'child', 'senior'
    language_pref VARCHAR(10) DEFAULT 'en', -- 'en', 'ta'
    emergency_pin VARCHAR(10) DEFAULT '1234',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contacts Table (Trusted Contacts)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    relationship VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'friend', -- 'family', 'friend', 'emergency'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trips Table (Live Journey tracking)
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin_address TEXT,
    destination_address TEXT,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    battery_percent INTEGER,
    safety_status VARCHAR(50) DEFAULT 'safe', -- 'safe', 'warning', 'danger', 'sos'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE
);

-- Trip Deviations Table (Guardian Mode)
CREATE TABLE deviations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    deviation_type VARCHAR(100) NOT NULL, -- 'route_deviation', 'unexpected_stop', 'speed_anomaly'
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Community Safety Reports Table (Heatmap and hazards)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL, -- 'harassment', 'dark_street', 'suspicious_activity', 'unsafe_area', 'road_hazard'
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    safety_rating INTEGER CHECK (safety_rating BETWEEN 1 AND 5), -- 1: Extremely Unsafe, 5: Moderately Unsafe
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SOS Events Table (Emergency events with uploaded evidence)
CREATE TABLE sos_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'resolved'
    audio_url TEXT,
    video_url TEXT,
    screenshot_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_reports_location ON reports(latitude, longitude);
CREATE INDEX idx_deviations_trip_id ON deviations(trip_id);
CREATE INDEX idx_sos_events_user_id ON sos_events(user_id);

-- Insert Sample Seed Data for Admin and Safe/Unsafe locations
INSERT INTO users (id, email, password_hash, name, phone, role, mode, language_pref) VALUES
('a0e829c6-a320-4b2a-a9a3-a7b2bc2c8e31', 'admin@safepath.ai', '$2b$10$wK1F5N8/rP/VqU.Jq34hIe0UqL4G5x6v/r5l.9G8f6m7t5r9t5o3a', 'SafePath Admin', '+15550199', 'admin', 'standard', 'en'),
('c3f912d8-b210-4c3b-b9b4-b8b3bc3c9f42', 'citizen@safepath.ai', '$2b$10$wK1F5N8/rP/VqU.Jq34hIe0UqL4G5x6v/r5l.9G8f6m7t5r9t5o3a', 'Anjali Devi', '+15550188', 'user', 'standard', 'ta');

-- Seed sample reports for heatmaps
INSERT INTO reports (category, description, latitude, longitude, safety_rating, created_at) VALUES
('dark_street', 'Streetlights broken for 2 weeks. Very dark and isolated.', 13.0827, 80.2707, 2, NOW() - INTERVAL '1 day'),
('harassment', 'Repeated catcalling near the bus stop in the evenings.', 13.0602, 80.2462, 1, NOW() - INTERVAL '2 days'),
('suspicious_activity', 'Unfamiliar group gathering behind the commercial center after hours.', 13.0850, 80.2100, 3, NOW() - INTERVAL '3 days'),
('unsafe_area', 'Abandoned building site, security fence broken.', 13.0450, 80.2600, 2, NOW() - INTERVAL '4 days');
