# Shipping Game Backend

This is the backend for the Shipping Game, built with Node.js and Express. It uses SQLite as the database to manage the shipping progress and game state.

## Game Description

The Shipping Game is a simulation game where players manage a shipping business. Players can start shipping orders, track progress, and complete shipments to earn money and upgrade their technologies. The goal is to efficiently manage resources and grow the business by leveraging various technologies.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup Instructions

1. **Clone the repository**
   ```sh
   git clone <repository-url>
   cd shipping-game/server
   ```

2. **Install Dependencies**
   ```sh
   npm install
   ```

## Running the Backend

1. **Start the Server**
   ```sh
   npm start
   ```
   This will start the backend server on `http://localhost:5005`.

2. **Start the Server in Hot Reload Mode**
   ```sh
   npm run dev
   ```
   This will start the backend server with hot reload enabled on `http://localhost:5005`.

## API Endpoints

- **POST /api/start-shipping**: Initiates the shipping process.
- **POST /api/update-progress**: Updates the progress value.
- **POST /api/complete-shipping**: Marks the shipping as completed.
- **GET /api/check-session**: Checks if a player session exists.
- **GET /api/game-info**: Retrieves game information for the logged-in player.
- **POST /api/create-account**: Creates a new player account.

## Folder Structure

```
server/
├── db/                  # Database-related scripts (if needed)
├── routes/              # Express routes (future expansion)
├── server.js            # Main server file
├── config.js            # Configuration file (e.g., port, database path)
├── package.json         # Backend dependencies and scripts
```

## License

This project is licensed under the ISC License.
