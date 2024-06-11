# Google Map Address Scrapper

## Description
Google Map Address Scrapper is a Node.js application designed to scrape, manage, and display addresses using Google Maps. This project helps with the collection of address data within specified geographic areas and visualizes them through an interactive web interface.

## Features
- **Address Scraping:** Select addresses on the map that you want to scrape.
- **Google Maps Integration:** Displays a map where you can insert address and jump to location and then have the ability to select the wanted addresses and get all the addresses from that area.

## How It Works

### 1. Address Scraping
The application scrapes addresses from the pins you describe on the map. The scraping process involves:

- **Selecting the area:** Selecting the addresses with pins that you want to scrape
- **API Usage:** The application uses the Google Maps Geocoding API to fetch address data. It calculates points of the markers that you put on the map. Valid points are sent to the Geocoding API to retrieve addresses.

### 2. Backend Server
The backend server, built with Express.js, handles HTTP requests and serves static files. Key functionalities include:

- **Getting Addresses:** An API endpoint to fetch addresses within the specified coordinates (`/api/get-addresses`). This endpoint processes the coordinates, calls the geocoding API, and saves the addresses to a text file (`addresses.txt`).

### 3. Address Management
The application manages address data by storing the scraped addresses in a text file (`addresses.txt`). Users can interact with the backend to scrape new addresses or update existing data.

### 4. Google Maps Integration
The frontend integrates with the Google Maps API to visualize scraped addresses on an interactive map. Users can view the addresses as markers on the map, providing a clear and interactive way to see the results of the scraping process.

### 5. Static Files
The `public` directory contains static files, including HTML, CSS, and JavaScript, used to build the frontend interface. These files are served by the Express.js server to the client.

### 6. Added new address search and management page search.html
The `search.html` page where you can search for the addresses in the database and mark them as sent, for marketing purposes.

## Technologies Used
- **Node.js:** JavaScript runtime for building the server.
- **Express.js:** Web framework for handling HTTP requests.
- **Google Maps API:** Service for displaying interactive maps and geocoding.
- **HTML/CSS/JavaScript:** Frontend technologies for building the web interface.
- **sqlite3** We added persistence for exported addresses

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
2. Use the interface to move to specific address.
3. Set the pins on the objects you need addresses scrapped.
4. Pull the data with pull button
5. Table below the map shows current data that can be exported with export button
6. Export and get the csv formatted data
7. Go to search page and search for the wanted addresses and mark them as already used in marketing purposes

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
