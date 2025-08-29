// storageUtils.js


export async function saveThingsToDatabase(endpoint, data) {
    //const apiUrl = `${API_BASE_URL}/${endpoint}`;

    let apiUrl = 'http://localhost:3001/api/' + endpoint;
    //let apiUrl = 'https://game-api-zjod.onrender.com/api/' + endpoint;

    //console.log('Saving to database:', apiUrl, data);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to save game');
        return await response.json();
    } catch (err) {
        console.error('Error saving game:', err.body || err.message || err``);
    }
}


export async function loadThingsFromDatabase(endpoint, ...params) {
    try {
        const apiUrl = `http://localhost:3001/api/${endpoint}/${params.join('/')}`;
        //const apiUrl = `https://game-api-zjod.onrender.com/api/${endpoint}/${params.join('/')}`;

        const response = await fetch(apiUrl, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Error loading data from database:', error);
        return null;
    }
}
