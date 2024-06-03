# Google Map Address Scrapper

## Description
Google Map Address Scrapper is a Node.js application designed to scrape, manage, and display addresses using Google Maps. This project automates the collection of address data within specified geographic areas and visualizes them through an interactive web interface.

## Features
- **Address Scraping:** Automatically scrape addresses from specified geographic coordinates.
- **Customizable Step Size:** Adjust the granularity of the scraping process to balance between accuracy and performance.
- **Google Maps Integration:** Display addresses on an interactive Google Map.
- **Static Files:** Serve static files from the public directory.
- **Backend Server:** Powered by Express.js to handle requests and data processing.

## How It Works

### 1. Address Scraping
The application scrapes addresses within a defined geographic area using coordinates provided by the user. The scraping process involves:

- **Defining Step Sizes:** The step size (low, medium, high) determines the granularity of the scraping grid. Smaller step sizes result in more detailed scraping but require more API calls.
- **API Usage:** The application uses the Google Maps Geocoding API to fetch address data. It calculates points within the specified polygon and checks if each point is within the polygon boundaries. Valid points are sent to the Geocoding API to retrieve addresses.

### 2. Backend Server
The backend server, built with Express.js, handles HTTP requests and serves static files. Key functionalities include:

- **Setting Step Size:** An API endpoint to adjust the step size (`/api/set-step-size`).
- **Getting Addresses:** An API endpoint to fetch addresses within the specified coordinates (`/api/get-addresses`). This endpoint processes the coordinates, calls the geocoding API, and saves the addresses to a text file (`addresses.txt`).

### 3. Address Management
The application manages address data by storing the scraped addresses in a text file (`addresses.txt`). Users can interact with the backend to scrape new addresses or update existing data.

### 4. Google Maps Integration
The frontend integrates with the Google Maps API to visualize scraped addresses on an interactive map. Users can view the addresses as markers on the map, providing a clear and interactive way to see the results of the scraping process.

### 5. Static Files
The `public` directory contains static files, including HTML, CSS, and JavaScript, used to build the frontend interface. These files are served by the Express.js server to the client.

## Technologies Used
- **Node.js:** JavaScript runtime for building the server.
- **Express.js:** Web framework for handling HTTP requests.
- **Google Maps API:** Service for displaying interactive maps and geocoding.
- **HTML/CSS/JavaScript:** Frontend technologies for building the web interface.

## Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/abastasrado/google-map-address-scrapper.git
   cd google-map-address-scrapper
   
2. **Install dependecies:**
   ```sh
   npm install

2. **Run the server:**
   ```sh
   node server.js

## Usage
1. Open your browser and navigate to `http://localhost:3000`.
2. Use the interface to set the step size and provide coordinates for scraping addresses.
3. View the scraped addresses displayed on Google Maps.

## Project Structure
- `server.js`: Main server file implementing the backend logic.
- `addresses.txt`: Contains scraped address data.
- `public/`: Directory for static files.
- `node_modules/`: Node.js dependencies.
- `package-lock.json`: Dependency tree for exact versions.
- `package.json`: Project metadata and dependencies.

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.
