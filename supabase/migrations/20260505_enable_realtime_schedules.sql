-- Enable Realtime on the schedules table so passengers and drivers
-- receive live updates when trip status or progress changes.
ALTER PUBLICATION supabase_realtime ADD TABLE schedules;
