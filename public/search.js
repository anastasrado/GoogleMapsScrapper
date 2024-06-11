function searchAddresses() {
    const query = document.getElementById('searchInput').value;

    if (!query) {
        alert('Please enter a search query.');
        return;
    }

    axios.post('/api/search-addresses', { query })
        .then(response => {
            const addresses = response.data.addresses;
            updateTable(addresses);
        })
        .catch(error => console.error('Error searching addresses:', error));
}

function updateTable(addresses) {
    const tableBody = document.getElementById('addressesTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear the table

    addresses.forEach(address => {
        const row = tableBody.insertRow();

        const addressCell = row.insertCell(0);
        const latCell = row.insertCell(1);
        const lngCell = row.insertCell(2);
        const timestampCell = row.insertCell(3);
        const flierSentCell = row.insertCell(4);
        const lastMarkedCell = row.insertCell(5);
        const actionCell = row.insertCell(6);

        addressCell.textContent = address.address;
        latCell.textContent = address.lat;
        lngCell.textContent = address.lng;
        timestampCell.textContent = address.timestamp;
        flierSentCell.textContent = address.flier_sent ? 'Yes' : 'No';
        lastMarkedCell.textContent = address.last_marked ? new Date(address.last_marked).toLocaleString() : 'N/A';

        const button = document.createElement('button');
        button.textContent = address.flier_sent ? 'Unmark' : 'Mark as Sent';
        button.onclick = () => updateAddressStatus(address.id, !address.flier_sent);
        actionCell.appendChild(button);
    });
}

function updateAddressStatus(id, flierSent) {
    axios.post('/api/update-address-status', { id, flierSent })
        .then(response => {
            searchAddresses(); // Refresh the table after update
        })
        .catch(error => console.error('Error updating address status:', error));
}
