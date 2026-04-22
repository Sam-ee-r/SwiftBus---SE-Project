-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'passenger');

-- Create Pakistan cities enum
CREATE TYPE public.pakistan_city AS ENUM (
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Hyderabad',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Jhang',
  'Sargodha',
  'Bahawalpur',
  'Gilgit',
  'Skardu',
  'Abbottabad',
  'Mardan',
  'Swat',
  'Muzaffarabad'
);

-- Create routes table
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure public.pakistan_city NOT NULL,
  destination public.pakistan_city NOT NULL,
  distance_km DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create buses table
CREATE TABLE public.buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_no TEXT UNIQUE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 40,
  route_id UUID REFERENCES public.routes(id),
  admin_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create profiles table (for all users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  license_no TEXT UNIQUE NOT NULL,
  phone_num TEXT,
  bus_id UUID REFERENCES public.buses(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bus_id UUID REFERENCES public.buses(id) NOT NULL,
  seat_no INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  travel_date DATE NOT NULL,
  booking_date TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bus_id, seat_no, travel_date)
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  mode TEXT,
  payment_date TIMESTAMPTZ DEFAULT now(),
  refund_flag BOOLEAN DEFAULT false
);

-- Enable RLS on all tables
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Routes policies (public read, admin write)
CREATE POLICY "Routes are viewable by everyone" ON public.routes FOR SELECT USING (true);
CREATE POLICY "Admins can insert routes" ON public.routes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update routes" ON public.routes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete routes" ON public.routes FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Buses policies (public read, admin write)
CREATE POLICY "Buses are viewable by everyone" ON public.buses FOR SELECT USING (true);
CREATE POLICY "Admins can insert buses" ON public.buses FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update buses" ON public.buses FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete buses" ON public.buses FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Drivers policies
CREATE POLICY "Drivers are viewable by everyone" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Admins can manage drivers" ON public.drivers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = passenger_id);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = passenger_id);

-- Payments policies
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = payments.booking_id AND bookings.passenger_id = auth.uid())
);
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = payments.booking_id AND bookings.passenger_id = auth.uid())
);
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  -- Default new users as passengers
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'passenger');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create schedules table to represent specific bus runs
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES public.buses(id) NOT NULL,
  route_id UUID REFERENCES public.routes(id) NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  travel_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add schedule_id to bookings so bookings reference schedules
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.schedules(id);

-- Add a uniqueness constraint for seat per schedule
ALTER TABLE public.bookings
  ADD CONSTRAINT IF NOT EXISTS bookings_schedule_seat_unique UNIQUE (schedule_id, seat_no);

-- Enable RLS and policies for schedules
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schedules are viewable by everyone" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Admins can manage schedules" ON public.schedules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Note: existing bookings still have bus_id and travel_date for compatibility.