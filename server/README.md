# Shipping Game Backend

This is the backend for the Shipping Game, built with Node.js and Express. It uses SQLite as the database to manage the shipping progress and game state.

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
   This will start the backend server on `http://localhost:5000`.

## API Endpoints

- **GET /api/shipping**: Retrieves the current shipping progress and state.
- **POST /api/start-shipping**: Initiates the shipping process.
- **POST /api/update-progress**: Updates the progress value.
- **POST /api/complete-shipping**: Marks the shipping as completed.

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
