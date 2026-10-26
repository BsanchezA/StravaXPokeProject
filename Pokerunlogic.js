
const https = require("https");
const { pipeline } = require("stream");

function Pokerunlogicbucket(matchedActivity, pipelineCallback){

    const distancemiles = matchedActivity.distance / 1609.34;
    let selectedTypes = [];

    if (distancemiles > 0 && distancemiles <= 3){
        selectedTypes = ["normal", "water", "grass", "rock", "poison", "ground"];
    }
    else if (distancemiles > 3 && distancemiles <= 10){
        selectedTypes = ["electric", "flying", "fighting", "ice"];
    }
    else if (distancemiles > 10){
        selectedTypes = ["steel", "psychic", "fire", "fairy"];
    }
    else {
        pipelineCallback(null, "missingno");
        return;
    }

    const randomTypeIndex = Math.floor(Math.random() * selectedTypes.length);
    const chosenType = selectedTypes[randomTypeIndex];

    const options = {
        hostname: "pokeapi.co",
        path: `/api/v2/type/${chosenType}`,
        method: "GET",
        headers: {
            "User-Agent": "NodeJS-Strava-Mashup-App"
        }
    };

    const req = https.request(options, function(apiRes){
        let rawData = "";
        apiRes.on("data", function(chunk) {
            rawData += chunk;
        });

        apiRes.on("end", function(){
            if (apiRes.statusCode !== 200) {
                pipelineCallback(new Error("PokeAPI connection rejected"), null);
                return;
            }
            let fulldata;
            try {
                fulldata = JSON.parse(rawData);
            } catch (err) {
                pipelineCallback(err, null);
                return;
            }
            const pokemonselected = fulldata.pokemon || fulldata;
            if (!pokemonselected || pokemonselected.length === 0){
                pipelineCallback(null, "substitute");
                return;
            }

            const randomPokemonIndex = Math.floor(Math.random() * pokemonselected.length);
            const chosen = pokemonselected[randomPokemonIndex];
            if (!chosen) {
                console.log("Error: Selecte slot is undefined");
                pipelineCallback(null, "Eevee");
                return;
            }
            let rawName = " ";
            if (chosen.pokemon) {
                rawName = chosen.pokemon.name;
            }
            else if (chosen.name) {
                rawName = chosen.name;
            }
            else {
                rawName = "Substitute";
            }
            const finalName = rawName.charAt(0).toUpperCase() + rawName.trim().slice(1);

            
            pipelineCallback(null, finalName);



        });
    });

    req.on("error", function(err){
        pipelineCallback(err, null);
    });

    req.end();
}

module.exports = {
    Pokerunlogicbucket: Pokerunlogicbucket
}