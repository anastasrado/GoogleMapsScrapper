const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

let geocodingAPICount = 0;
let placesAPICount = 0;

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
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

const GOOGLE_API_KEY = '<GOOGLE_API_KEY>';

app.post('/api/get-addresses', async (req, res) => {
    const { coordinates } = req.body;
    if (!coordinates || coordinates.length === 0) {
        return res.status(400).json({ error: 'No coordinates provided' });
    }

    try {
        const addresses = await getAddressesWithinPolygon(coordinates);
        const filePath = path.join(__dirname, 'addresses.txt');
        fs.writeFileSync(filePath, addresses.join('\n'));

        res.json({ file: 'addresses.txt', geocodingAPICount, placesAPICount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function getAddressesWithinPolygon(coordinates) {
    const addresses = new Set();
    const bounds = getPolygonBounds(coordinates);
    const stepSize = currentStepSize;

    for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += stepSize) {
        for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += stepSize) {
            const point = { lat, lng };
            if (isPointInPolygon(point, coordinates)) {
                const address = await getAddress(point);
                if (address) addresses.add(address);
                console.log(`Queried point: ${point.lat}, ${point.lng}, Address: ${address}`); // Debug log
            }
        }
    }
    return Array.from(addresses);
}

function getPolygonBounds(coordinates) {
    let minLat = coordinates[0].lat, maxLat = coordinates[0].lat;
    let minLng = coordinates[0].lng, maxLng = coordinates[0].lng;

    coordinates.forEach(coord => {
        if (coord.lat < minLat) minLat = coord.lat;
        if (coord.lat > maxLat) maxLat = coord.lat;
        if (coord.lng < minLng) minLng = coord.lng;
        if (coord.lng > maxLng) maxLng = coord.lng;
    });

    return { minLat, maxLat, minLng, maxLng };
}

function isPointInPolygon(point, vs) {
    let x = point.lat, y = point.lng;
    let inside = false;

    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].lat, yi = vs[i].lng;
        let xj = vs[j].lat, yj = vs[j].lng;
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
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
        // Remove the country code (", USA") at the end of the address
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
