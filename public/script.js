let map;
let drawingManager;
let selectedShape;
let searchMarker;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 8,
    });

    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['polygon']
        },
    });
    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {
        if (selectedShape) {
            selectedShape.setMap(null);
        }
        selectedShape = event.overlay;
    });

    document.getElementById('stepSizePicker').addEventListener('change', async (event) => {
        const stepSize = event.target.value;
        try {
            const response = await fetch('/api/set-step-size', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stepSize })
            });
            const data = await response.json();
            console.log(data.message);
        } catch (error) {
            console.error('Error setting step size:', error);
        }
    });
}

function exportAddresses() {
    if (selectedShape) {
        const paths = selectedShape.getPath().getArray().map(path => ({ lat: path.lat(), lng: path.lng() }));
        showLoading();
        axios.post('/api/get-addresses', { coordinates: paths })
            .then(response => {
                const link = document.getElementById('downloadLink');
                link.href = `/download/${response.data.file}`;
                link.download = 'addresses.txt';
                link.style.display = 'block';
                link.click();
                link.style.display = 'none';

                document.getElementById('geocodingAPICount').innerText = response.data.geocodingAPICount;
                document.getElementById('placesAPICount').innerText = response.data.placesAPICount;
            })
            .catch(error => {
                console.error(error);
                alert('Error fetching addresses.');
            })
            .finally(() => hideLoading());
    } else {
        alert('No polygon selected.');
    }
}

function jumpToAddress() {
    const address = document.getElementById('addressInput').value;
    showLoading();
    axios.post('/api/center-map', { address })
        .then(response => {
            const location = response.data;
            const latLng = new google.maps.LatLng(location.lat, location.lng);
            map.setCenter(latLng);
            map.setZoom(15);

            if (searchMarker) {
                searchMarker.setMap(null);
            }

            searchMarker = new google.maps.Marker({
                position: latLng,
                map: map
            });

            if (selectedShape) {
                selectedShape.setMap(null);
                selectedShape = null;
            }

            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        })
        .catch(error => {
            console.error(error);
            alert('Error finding address: ' + error.message);
        })
        .finally(() => hideLoading());
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

window.onload = initMap;
