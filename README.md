# Meeting Room Booking System — Backend API

Backend RESTful API for the Meeting Room Booking System built with **Express.js**, **Prisma ORM**, and **MySQL**.

---

## Tech Stack
* **Runtime Environment**: Node.js
* **Framework**: Express.js
* **Database**: MySQL 8.x
* **ORM**: Prisma ORM
* **Process Manager**: Nodemon (development)

---

## Features
* **Full CRUD Master Data**:
  * **Units** (`/api/units`)
  * **Meeting Rooms** (`/api/rooms`) — includes active booking validations on delete.
  * **Consumptions** (`/api/consumptions`) — supports pre-defined options (*Snack Siang*, *Makan Siang*, *Snack Sore*) with custom prices.
* **Booking Engine** (`/api/bookings`):
  * **Schedule Conflict Detection**: Overlap checker to prevent booking conflicts for the same room on the same day and time.
  * **Capacity Validation**: Prevents booking if number of attendees exceeds room capacity.
  * **Cost Calculation Service**: Automatically computes subtotals and grand totals based on attendee counts and selected consumption packages.
* **Cascading Delete**: Automatically cleans up linked consumption details when a booking is deleted.

---

## Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18.x or higher recommended)
* **npm** (v9.x or higher)
* **MySQL Server** (v8.x)

---

## Getting Started

### 1. Clone & Install Dependencies
Navigate to the backend directory and install all required modules:
```bash
cd mohammad_faizal_backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and adjust the database credentials to match your MySQL configuration:
```bash
cp .env.example .env
```
Inside `.env`:
```env
PORT=5000
DATABASE_URL="mysql://username:password@localhost:3306/meeting_room"
```

### 3. Setup the Database Schema (Prisma)
Create the database in MySQL named `meeting_room` (if not already created), then run the Prisma migrations to generate the tables:
```bash
# Run database migrations
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate
```

### 4. Seed Initial Data
Populate the database with default consumption packages, sample departments (units), and meeting rooms:
```bash
npx prisma db seed
```
This seeds the following default data:
* **Consumptions**: Snack Siang (Rp 25.000), Makan Siang (Rp 50.000), Snack Sore (Rp 25.000)
* **Units**: Divisi IT, Divisi HR, Divisi Finance, Divisi Marketing
* **Rooms**: Ruang Rapat Utama (30 pax), Ruang Meeting A (15 pax), Ruang Meeting B (10 pax), Ruang Diskusi (6 pax)

### 5. Run the Application
Start the development server with hot-reloading:
```bash
npm run dev
```
The API server will run on `http://localhost:5000`.

---

## API Endpoints Reference

All requests and responses follow the standard JSON structure:
`{ "success": boolean, "data": any, "message": string }`

### 1. Unit Endpoints (`/api/units`)
* `GET /api/units` - Retrieve all units.
* `GET /api/units/:id` - Get unit details.
* `POST /api/units` - Create a unit (`{ "name": "Divisi Baru" }`).
* `PUT /api/units/:id` - Update unit name.
* `DELETE /api/units/:id` - Delete a unit.

### 2. Meeting Room Endpoints (`/api/rooms`)
* `GET /api/rooms` - Retrieve all rooms.
* `POST /api/rooms` - Create a room (`{ "name": "Aura Room", "capacity": 20 }`).
* `PUT /api/rooms/:id` - Update room details.
* `DELETE /api/rooms/:id` - Delete a room (fails with `409` if the room has active/future bookings).

### 3. Consumption Endpoints (`/api/consumptions`)
* `GET /api/consumptions` - Retrieve available consumptions.
* `POST /api/consumptions` - Create a consumption (`{ "name": "Snack Siang", "pricePerPax": 20000 }`).
* `PUT /api/consumptions/:id` - Update consumption price.
* `DELETE /api/consumptions/:id` - Delete a consumption.

### 4. Booking Endpoints (`/api/bookings`)
* `GET /api/bookings` - Get all bookings with room, unit, and consumption details.
* `POST /api/bookings` - Create a new booking.
  * **Payload**:
    ```json
    {
      "unit_id": 1,
      "meeting_room_id": 2,
      "date": "2026-06-20",
      "start_time": "09:00",
      "end_time": "11:00",
      "number_of_attendees": 12,
      "consumption_ids": [1, 2]
    }
    ```
* `PUT /api/bookings/:id` - Update an existing booking (re-validates conflicts and updates cost).
* `DELETE /api/bookings/:id` - Delete a booking (triggers cascade delete on selected consumptions).

---

## Project Structure
```text
mohammad_faizal_backend/
├── prisma/
│   ├── migrations/      # SQL database migrations
│   ├── schema.prisma    # Database design & schemas
│   └── seed.js          # Pre-populated seeds data
├── src/
│   ├── controllers/     # Request handles (endpoints logic)
│   ├── db/              # Prisma Client wrapper initialization
│   ├── middleware/      # Custom error handling
│   ├── routes/          # Express route bindings
│   ├── services/        # Schedule overlap validation & cost estimation services
│   ├── app.js           # Express main application config
│   └── index.js         # HTTP server entry point
├── .env.example
├── package.json
└── README.md
```
