let map;
let markers = [];
let searchMarker;
let exportedAddresses = {};

async function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 8,
    });

    google.maps.event.addListener(map, 'click', function(event) {
        placeMarker(event.latLng);
    });

    // Add autocomplete functionality to the search input field
    const addressInput = document.getElementById('addressInput');
    const autocomplete = new google.maps.places.Autocomplete(addressInput);
    autocomplete.bindTo('bounds', map);

    // Add event listener to the search input field
    addressInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            jumpToAddress();
        }
    });

    // Fetch previously exported addresses
    await fetchExportedAddresses();
}

function placeMarker(location) {
    const marker = new google.maps.Marker({
        position: location,
        map: map,
        draggable: true,
        queried: false, // New marker is not queried yet
        address: 'Pending...', // Default address
        lastExported: null // Default last exported timestamp
    });

    marker.addListener('dragend', () => updateMarkerPosition(marker));
    marker.addListener('dblclick', () => removeMarker(marker));

    markers.push(marker);

    // Add row to the table
    addMarkerToTable(marker);
    updateCostDisplay(markers.filter(marker => !marker.queried).length); // Update cost display
}

function addMarkerToTable(marker) {
    const table = document.getElementById('markersTable').getElementsByTagName('tbody')[0];
    const row = table.insertRow();
    const addrCell = row.insertCell(0);
    const exportCell = row.insertCell(1);
    const actionCell = row.insertCell(2);

    addrCell.textContent = marker.address;
    exportCell.textContent = marker.lastExported ? `Last exported: ${marker.lastExported}` : 'Not exported';
    actionCell.innerHTML = `<button onclick="removeMarker(markers[${markers.indexOf(marker)}])">Remove</button>`;
}

function updateMarkerPosition(marker) {
    const index = markers.indexOf(marker);
    if (index !== -1) {
        markers[index].queried = false; // Mark as not queried since position changed
        markers[index].address = 'Pending...'; // Reset address
        markers[index].lastExported = null; // Reset export status
    }
    updateTable();
    updateCostDisplay(markers.filter(marker => !marker.queried).length); // Update cost display
}

function pullData() {
    const newMarkers = markers.filter(marker => !marker.queried);
    const coordinates = newMarkers.map(marker => ({
        lat: marker.getPosition().lat(),
        lng: marker.getPosition().lng()
    }));

    axios.post('/api/get-addresses', { coordinates })
        .then(response => {
            const addresses = response.data.addresses;
            newMarkers.forEach((marker, index) => {
                marker.address = addresses[index];
                marker.queried = true; // Mark this marker as queried
            });
            updateTable();
            if (addresses.length > 0) {
                // document.getElementById('exportButton').style.display = 'inline-block'; // Show export button
                document.getElementById('exportExcelButton').style.display = 'inline-block'; // Show export to Excel button
            }
        })
        .catch(error => console.error('Error pulling data:', error));
}

function removeMarker(marker) {
    const index = markers.indexOf(marker);
    if (index !== -1) {
        marker.setMap(null);
        markers.splice(index, 1);
        updateTable();
        checkExportButtonVisibility();
        updateCostDisplay(markers.filter(marker => !marker.queried).length); // Update cost display
    }
}

function updateTable() {
    const tableBody = document.getElementById('markersTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear the table
    markers.forEach(marker => {
        if (exportedAddresses[marker.address]) {
            marker.lastExported = exportedAddresses[marker.address];
        }
        addMarkerToTable(marker);
    }); // Re-add all markers to the table
}

function exportAddresses() {
    if (markers.length === 0) {
        alert('No markers placed.');
        return;
    }

    const coordinates = markers.map(marker => ({
        lat: marker.getPosition().lat(),
        lng: marker.getPosition().lng()
    }));
    showLoading();
    axios.post('/api/get-addresses', { coordinates })
        .then(response => handleResponse(response))
        .catch(error => console.error('Error exporting addresses:', error))
        .finally(() => hideLoading());
}

function jumpToAddress() {
    const address = document.getElementById('addressInput').value;
    axios.post('/api/center-map', { address })
        .then(response => {
            const location = response.data;
            const latLng = new google.maps.LatLng(location.lat, location.lng);
            map.setCenter(latLng);
            map.setZoom(18);

            if (searchMarker) {
                searchMarker.setMap(null);
            }

            searchMarker = new google.maps.Marker({
                position: latLng,
                map: map,
                icon: {
                    url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                }
            });
        })
        .catch(error => {
            console.error('Error finding address:', error);
            alert('Error finding address: ' + error.message);
        })
        .finally(() => hideLoading());
}

function clearAllMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    if (searchMarker) {
        searchMarker.setMap(null);
        searchMarker = null;
    }
    updateTable();
    checkExportButtonVisibility();
    updateCostDisplay(0); // Update cost display
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function exportToExcel() {
    if (markers.length === 0) {
        alert('No markers to export.');
        return;
    }

    const searchTerm = document.getElementById('addressInput').value;
    const data = markers.map(marker => ({
        address: marker.address,
        lat: marker.getPosition().lat(),
        lng: marker.getPosition().lng()
    }));

    axios.post('/api/export-addresses', { addresses: data })
        .then(response => {
            const timestamp = response.data.timestamp;
            data.forEach(item => {
                item.lastExported = timestamp;
                exportedAddresses[item.address] = timestamp;
            });
            updateTable();

            // Prepare data for Excel export
            const excelData = data.map(item => {
                const splitAddress = splitAddressComponents(item.address);
                return {
                    Address: splitAddress.street,
                    City: splitAddress.city,
                    'State + Zip Code': splitAddress.stateZip
                };
            });

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Markers');

            const date = new Date();
            const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
            const filename = `${searchTerm}_${data.length}_${dateString}.xlsx`;

            XLSX.writeFile(wb, filename);
        })
        .catch(error => console.error('Error exporting addresses:', error));
}

// Function to split address into components
function splitAddressComponents(address) {
    const addressParts = address.split(',').map(part => part.trim());
    let street = '', city = '', stateZip = '';

    if (addressParts.length === 4) {
        street = addressParts[0];
        city = addressParts[1];
        stateZip = addressParts[2] + ' ' + addressParts[3];
    } else if (addressParts.length === 3) {
        street = addressParts[0];
        city = addressParts[1];
        stateZip = addressParts[2];
    } else {
        street = address;  // Fallback for unexpected address format
    }

    return {
        street,
        city,
        stateZip
    };
}


function splitAddress(address) {
    const addressParts = address.split(',').map(part => part.trim());
    let street = '', city = '', state = '', zip = '';

    if (addressParts.length === 4) {
        street = addressParts[0];
        city = addressParts[1];
        state = addressParts[2].split(' ')[0];
        zip = addressParts[2].split(' ')[1];
    } else if (addressParts.length === 3) {
        street = addressParts[0];
        city = addressParts[1];
        state = addressParts[2].split(' ')[0];
        zip = addressParts[2].split(' ')[1];
    } else {
        // Handle any other cases if necessary
        street = address;
    }

    return {
        Street: street,
        City: city,
        State: state,
        Zip: zip
    };
}

let showingAddresses = false;
let addressMarkers = [];

async function toggleAddresses() {
    const toggleButton = document.getElementById('toggleAddressesButton');
    if (showingAddresses) {
        // Hide addresses
        addressMarkers.forEach(marker => marker.setMap(null));
        addressMarkers = [];
        toggleButton.textContent = 'Show Addresses in Region';
    } else {
        // Show addresses
        const bounds = map.getBounds();
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();

        console.log('Map Bounds:', {
            ne: { lat: ne.lat(), lng: ne.lng() },
            sw: { lat: sw.lat(), lng: sw.lng() }
        });

        try {
            const response = await axios.post('/api/get-addresses-in-region', {
                ne: { lat: ne.lat(), lng: ne.lng() },
                sw: { lat: sw.lat(), lng: sw.lng() }
            });

            console.log('Server Response:', response.data);
            const addresses = response.data.addresses;
            addresses.forEach(address => {
                const latLng = new google.maps.LatLng(address.lat, address.lng);
                const marker = new google.maps.Marker({
                    position: latLng,
                    map: map,
                    icon: address.flier_sent ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
                    title: address.address
                });
                addressMarkers.push(marker);
            });
        } catch (error) {
            console.error('Error fetching addresses:', error);
        }
        toggleButton.textContent = 'Hide Addresses in Region';
    }
    showingAddresses = !showingAddresses;
}

async function fetchExportedAddresses() {
    try {
        const response = await axios.get('/api/get-export-info');
        const exportInfo = response.data.exports;
        exportInfo.forEach(item => {
            exportedAddresses[item.address] = item.timestamp;
        });
        updateTable();
    } catch (error) {
        console.error('Error fetching exported addresses:', error);
    }
}

function checkExportButtonVisibility() {
    const hasQueriedMarkers = markers.some(marker => marker.queried);
    // document.getElementById('exportButton').style.display = hasQueriedMarkers ? 'inline-block' : 'none';
    document.getElementById('exportExcelButton').style.display = hasQueriedMarkers ? 'inline-block' : 'none';
}

function updateCostDisplay(requestCount) {
    const baseCost = 0.005;
    const discountCost = 0.004;
    const threshold = 100000;

    let cost;
    if (requestCount <= threshold) {
        cost = requestCount * baseCost;
    } else {
        cost = threshold * baseCost + (requestCount - threshold) * discountCost;
    }

    document.getElementById('costDisplay').textContent = `Cost: $${cost.toFixed(2)}`;
}

window.onload = initMap;
