const fs = require("fs");
const url = require("url");
const http = require("http");
const https = require("https");
const querystring = require("querystring"); 

const {client_id, client_secret, scope} = require("./credentials.json");
const Pokerunlogic = require("./Pokerunlogic");

const host = "localhost";
const port = 3000;

const activity_states = [];
const server = http.createServer();

// Listens to the port and ready for requests from clients
server.on("listening", listenhandler);
server.listen(port);
function listenhandler(){
    console.log(`Now Listening on Port ${port}`);
    console.log(server.address());
}

server.on("request", request_handler);

function readCache(){
    try{
        return JSON.parse(fs.readFileSync("./strava_cache.json", "utf8"));
    }catch(err){
        return null;
    }
}

function request_handler(req, res){ 
    console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`);

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    if (pathname === "/"){
        const cached_auth = readCache();
        let cache_valid = false;
        if (cached_auth && new Date(cached_auth.expiration) > Date.now()){
            cache_valid = true;
        }
        if (cache_valid){
            const form = fs.createReadStream("gen.html");
            console.log("Cache was found and skipped auth")
            res.writeHead(200, {"Content-Type": "text/html"});
            form.pipe(res);
        }
        else{
            console.log("No cache found, going through normal auth");
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end("<h1>Welcome</h1><a href='/login'> <button> Connect with Strava </button></a>");
        }
    }
    else if (pathname === "/login"){

        const redirectUri = `http://${host}:${port}/callback`;
        const stravaAuthUrl = "https://www.strava.com/oauth/authorize?" + 
        querystring.stringify ({
            client_id: client_id,
            redirect_uri: redirectUri,
            response_type: "code",
            approval_prompt: "auto",
            scope: scope
        });
        console.log("welcome user");
        res.writeHead(302, {"Location": stravaAuthUrl});
        res.end();
       // }
    }

    else if (pathname === "/callback"){
        const code = parsedUrl.query.code;

        if (!code) {
            res.writeHead(400, {"Content-Type": "text/plain"});
            res.end("Authorization failed: No code returned from Strava.");
            return;
        }
        // this is still first authorization, getting the code for the access token
        console.log("Found authorization code");
        exchangeToken(code, function(err, tokenData) {
            if (err) {
                res.writeHead(500, {"Content-Type": "text/plain"});
                res.end("Error,can't grab token with code");
                return;
            }
            console.log("Done")
            res.writeHead(302, {"Location": "/"});
            res.end();
        });
    }

    else if (pathname === "/submit-run"){
        const currentToken = readCache();
        if (!currentToken){
            res.writeHead(302, {"Location": "/"});
            res.end();
            return;
        }
        const currentTime = Math.floor(Date.now() / 1000);

        const userDate = parsedUrl.query.activityDate;
        const userDescription = parsedUrl.query.activityDescription;

        if (currentToken.expires_at <= currentTime + 10){
            console.log("Token expired");
            refreshAccessToken(currentToken.refresh_token, function(err, newTokens){
                if (err) {
                    res.writeHead(500, {"Content-Type": "text/plain"});
                    res.end("Failed to refresh Strava authentication cred.");
                    return;
                }
                processWorkoutpipeline(userDate, userDescription, newTokens.access_token, res);

            });
        }
        else {
            console.log("Token valid");
            processWorkoutpipeline(userDate, userDescription, currentToken.access_token, res);

        }
    }
    else {
        res.writeHead(404, {"Content-type": "text/plain"});
        res.end("404 not found");
    }
}






// October 19th 2026: I'm fixing this up for resume display, something is wrong and not getting the correct access token for writing, we have it for reading but not writing



function create_access_token_cache(parsedData, token_request_time){
    parsedData.expiration = new Date(token_request_time.getTime() + (parsedData.expires_in * 1000));
    fs.writeFileSync('./strava_cache.json', JSON.stringify(parsedData), () => console.log("Access Token Cached"));
    //console.log("Access Token Cached");
}


//This is for the exchange of token for authorization with OAUTH
function exchangeToken(authcode, callback){

    const postData = querystring.stringify({
        client_id: client_id,
        client_secret: client_secret,
        code: authcode,
        grant_type: "authorization_code"
    });

    const options = {
        hostname: "www.strava.com",
        path : "/oauth/token",
        method: "POST",
        headers: {
            "Content-type": "application/x-www-form-urlencoded",
            "Content-length": Buffer.byteLength(postData)
        }
    };
    // Above has the information on what to give
    const token_request_time = new Date();
    const req = https.request(options, function(res) {
        let rawData = "";
        res.on("data", function(chunk) {rawData += chunk});
        res.on("end", function() {
            if (res.statusCode !== 200){
                callback(new Error("Strava token rejected"), null);
                return;
            }
            let parsedData;
            try {
            parsedData = JSON.parse(rawData);
            create_access_token_cache(parsedData, token_request_time);
            } catch (err) {
                callback(err, null);
                return;
            }
            callback(null, parsedData)
        });

    });

    req.on("error", function(err) {
        callback(err, null);
    });
    req.write(postData);
    req.end();
}

//This function runs when we need the access expires and need to verify with the
//refresh token this time
//This is called when the access expires only, other wise we use the cache function
function refreshAccessToken(refreshToken, callback){
    const postData = querystring.stringify({
        client_id: client_id,
        client_secret: client_secret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
    });

    const options = {
        hostname: "www.strava.com",
        path: "/oauth/token",
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(postData)
        }
    };
    const token_request_time = new Date();

    const req = https.request(options, function(res){
        let rawData = "";
        res.on("data", function(chunk) {rawData += chunk});
        res.on("end", function(){
            if (res.statusCode !== 200){
                callback(new Error("Failed to refresh token"), null);
                return;
            }
            let parsedData;
            try{
            parsedData = JSON.parse(rawData);
            create_access_token_cache(parsedData, token_request_time);
            } catch (err) {
                callback(err, null);
                return;
            }
            callback(null,parsedData);
        });
    });
    req.on("error", function(err) {callback(err, null)});
    req.write(postData);
    req.end();
}

function processWorkoutpipeline(userDate, userDescription, accessToken, res){
    console.log(`searching data for activity on ${userDate}`);

    const options = {
        hostname: "www.strava.com",
        path: "/api/v3/athlete/activities",
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    };

    const req =  https.request(options, function(stravaRes){
        let rawData = "";
        stravaRes.on("data", function(chunk) {
            rawData += chunk;
        });

        stravaRes.on("end", function(){
            if (stravaRes.statusCode !== 200){
                console.log("Strava GET failed:", stravaRes.statusCode, rawData);
                res.writeHead(stravaRes.statusCode, {"Content-Type": "text/plain"});
                res.end("Failed to fetch activities from Strava. Check permissions");
                return;
            }
            let activities;
            try {
                activities = JSON.parse(rawData);
            } catch (err) {
                res.writeHead(502, {"Content-Type": "text/plain"});
                res.end("Strava returned invalid data");
                return;
            }
            let matchedActivity = null;

            for (let i = 0; i < activities.length; i++){
                const stravaDate = activities[i].start_date_local.slice(0, 10);

                if (stravaDate === userDate){
                    matchedActivity = activities[i];
                    break;
                }
            }
            if (!matchedActivity){
                res.writeHead(404, {"Content-Type": "text/html"});
                res.end(`<h2>Error: No activity found on strava matching ${userDate}`);
                return;
            }

            Pokerunlogic.Pokerunlogicbucket(matchedActivity, function(err, matchedPokemon){
                if (err) {
                    res.writeHead(500, {"Content-Type": "text/plain"});
                    res.end("Internal Error loading from Poke API");
                    return;
                }
                const finalDescription = `${userDescription} | Caught a wild ${matchedPokemon}`;

                const putData = JSON.stringify({
                    description: finalDescription
                });

                const Putoptions = {
                    hostname: "www.strava.com",
                    path: `/api/v3/activities/${matchedActivity.id}`,
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(putData)
                    }
                };


                const putReq = https.request(Putoptions, function(putRes) {
                    let putRawData = "";
                    putRes.on("data", function(chunk) {putRawData += chunk;});
                    putRes.on("end", function(){
                        if (putRes.statusCode !== 200){
                            res.writeHead(putRes.statusCode, {"Content-Type": "text/plain"});
                            res.end("Failed to update description");
                            return;
                        }
                        res.writeHead(200, {"Content-Type": "text/html"});
                        res.end(`<h1>Done</h1>
                                <a href="/"> Back to Dashboard</a>
                            `);
                    });
                });

                putReq.on("error", function(err){
                    res.writeHead(500, {"Content-Type": "text/plain"});
                    res.end("Error with put request");
                });
                putReq.write(putData);
                putReq.end();
            });
        });

    });

    req.on("error", function(err){
        res.writeHead(500, {"Content-Type": "text/plain"});
        res.end("Internal server error with strava data retriveal");
    });
    
    req.end();

}




