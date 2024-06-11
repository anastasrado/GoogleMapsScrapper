const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const GOOGLE_API_KEY = 'YOUR KEY';

const app = express();
const PORT = 3000;

let geocodingAPICount = 0;
let placesAPICount = 0;

app.use(bodyParser.json());
app.use(express.static('public'));

const db = new sqlite3.Database('./exported_addresses.db', (err) => {
    if (err) {
        return console.error("Error opening database:", err.message);
    }
    console.log("Connected to the SQLite database.");

    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS exports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            address TEXT,
            lat REAL,
            lng REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                return console.error("Error creating table:", err.message);
            }
            console.log("Table created or already exists.");

            // Insert sample data
            const sampleData = [
                { address: '1600 Amphitheatre Parkway, Mountain View, CA 94043', lat: 37.4224764, lng: -122.0842499 },
                { address: '1 Infinite Loop, Cupertino, CA 95014', lat: 37.33182, lng: -122.03118 }
            ];

            const stmt = db.prepare("INSERT INTO exports (address, lat, lng) VALUES (?, ?, ?)");
            sampleData.forEach(data => {
                stmt.run(data.address, data.lat, data.lng, function (err) {
                    if (err) {
                        return console.error("Error inserting sample data:", err.message);
                    }
                    console.log(`Inserted data: ${data.address} (${data.lat}, ${data.lng})`);
                });
            });
            stmt.finalize();
        });
    });
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve search.html
app.get('/search.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'search.html'));
});

const stepSizes = {
    low: 0.0005,
    medium: 0.0002,
    high: 0.0001
};

let currentStepSize = stepSizes.medium; // Default step size

app.post('/api/set-step-size', (req, res) => {
    const { stepSize } = req.body;
    if (!stepSizes[stepSize]) {
        return res.status(400).json({ error: 'Invalid step size' });
    }

    currentStepSize = stepSizes[stepSize];
    res.json({ message: 'Step size set successfully' });
});

app.post('/api/get-addresses', async (req, res) => {
    const { coordinates } = req.body;
    if (!coordinates || coordinates.length === 0) {
        return res.status(400).json({ error: 'No coordinates provided' });
    }

    try {
        const addresses = await getAddresses(coordinates);
        res.json({ addresses });  // Return the list of addresses
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/export-addresses', async (req, res) => {
    const { addresses } = req.body;
    if (!addresses || addresses.length === 0) {
        return res.status(400).json({ error: 'No addresses provided' });
    }

    try {
        const timestamp = new Date().toISOString();
        const stmt = db.prepare(`INSERT INTO exports (address, lat, lng) VALUES (?, ?, ?)`);
        addresses.forEach(({ address, lat, lng }) => {
            if (address && lat && lng) {
                stmt.run(address, lat, lng, function (err) {
                    if (err) {
                        return console.error("Error inserting data:", err.message);
                    }
                    console.log(`Inserted data: ${address} (${lat}, ${lng})`);
                });
            } else {
                console.error("Invalid data:", { address, lat, lng });
            }
        });
        stmt.finalize();
        res.json({ message: 'Addresses exported successfully', timestamp });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to search addresses
app.post('/api/search-addresses', (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'No query provided' });
    }

    const searchQuery = `%${query}%`;

    const sql = `
        SELECT id, address, lat, lng, timestamp, flier_sent, last_marked
        FROM exports
        WHERE address LIKE ?
    `;
    const params = [searchQuery];

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ addresses: rows });
    });
});

// Endpoint to update address status
app.post('/api/update-address-status', (req, res) => {
    const { id, flierSent } = req.body;

    if (id === undefined || flierSent === undefined) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const lastMarked = flierSent ? new Date().toISOString() : null;
    const sql = `UPDATE exports SET flier_sent = ?, last_marked = ? WHERE id = ?`;
    const params = [flierSent, lastMarked, id];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Address status updated successfully' });
    });
});

app.get('/api/get-export-info', (req, res) => {
    db.all(`SELECT address, lat, lng, timestamp FROM exports`, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        console.log('Fetched data:', rows);
        res.json({ exports: rows });
    });
});

app.post('/api/get-addresses-in-region', (req, res) => {
    const { ne, sw } = req.body;

    if (!ne || !sw) {
        console.error('Invalid bounds provided:', req.body);
        return res.status(400).json({ error: 'Invalid bounds' });
    }

    console.log('Received bounds:', { ne, sw });

    const query = `
        SELECT address, lat, lng FROM exports
        WHERE lat BETWEEN ? AND ?
        AND lng BETWEEN ? AND ?
    `;
    const params = [sw.lat, ne.lat, sw.lng, ne.lng];

    console.log('Executing query with params:', params);

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('Query results:', rows);
        res.json({ addresses: rows });
    });
});

async function getAddresses(coordinates) {
    const addressList = [];
    for (let location of coordinates) {
        const address = await getAddress(location);
        if (address) {
            addressList.push(address);
        } else {
            addressList.push('No address found');  // Fallback if no address was returned
        }
    }
    return addressList;
}

async function getAddress(location) {
    geocodingAPICount++;
    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
        params: {
            key: GOOGLE_API_KEY,
            latlng: `${location.lat},${location.lng}`
        }
    });

    if (response.data.status === 'OK') {
        let formattedAddress = response.data.results[0].formatted_address;
        // Optionally remove country code as before
        formattedAddress = formattedAddress.replace(/, USA$/, '');
        return formattedAddress;
    }
    return null;
}

app.post('/api/center-map', async (req, res) => {
    const { address } = req.body;
    if (!address) {
        return res.status(400).json({ error: 'No address provided' });
    }

    try {
        placesAPICount++;
        const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
            params: {
                key: GOOGLE_API_KEY,
                address: address,
            }
        });

        if (response.data.status !== 'OK') {
            throw new Error('Error fetching address');
        }

        const location = response.data.results[0].geometry.location;
        res.json(location);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/download/:file', (req, res) => {
    const filePath = path.join(__dirname, req.params.file);
    res.download(filePath);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
