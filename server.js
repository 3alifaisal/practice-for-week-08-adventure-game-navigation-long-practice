const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {

  /* ============== ASSEMBLE THE REQUEST BODY AS A STRING =============== */
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });

  req.on('end', () => { // After the assembly of the request body is finished
    /* ==================== PARSE THE REQUEST BODY ====================== */
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
         
          return acc;
        }, {});
    }

    /* ======================== ROUTE HANDLERS ========================== */
    // Phase 1: GET /
    if(req.method === 'GET' && req.url === '/'){
      const htmlFile = fs.readFileSync("./views/new-player.html","utf-8");

      let resBody = htmlFile
      .replace(/#{availableRooms}/g, world.availableRoomsToString());
      res.statusCode = 200;
      res.setHeader("Content-Type","text/html");
      res.end(resBody);
      return;

    }
    // Phase 2: POST /player
    if(req.method === 'POST' && req.url === "/player") {
      // obtaining roomId and player name from form request
      const { name, roomId: startingRoomId } = req.body;
      // create a new player
      const startingRoom = world.rooms[startingRoomId];
      player = new Player(name, startingRoom)
      // pass player to room

      // set code
      res.statusCode = 302; // ok
      // set header - content - redirect
      res.setHeader('Location', '/rooms/' + startingRoomId);
      //set body - none
      // finish
      console.log('player after post player', player);
      return res.end(); // can be res.end() only

    }
    // All route handlers after phase 2 should require a player.
    if (!player) { //if no player of some reason (e.g using postman) then redirect to start
      // If room is not  current player's room, redirect to current room 
      res.statusCode = 302
      res.setHeader('Location', "/");
      // finish
      res.end()
      return
    };
    
    

    // Phase 3: GET /rooms/:roomId
     let urlParts = req.url.split("/");
     
    if(req.method === 'GET' && req.url.startsWith("/rooms/") && urlParts.length === 3){
      let roomId = urlParts[2];
      const currentRoom = world.rooms[roomId];


      if (currentRoom !== player.currentRoom) {
        // If room is not  current player's room, redirect to current room 
        res.statusCode = 302
        res.setHeader('Location', "/rooms/" + player.currentRoom["id"]);
        // finish
        res.end()
        return;
      }


        
        const htmlPage = fs.readFileSync("./views/room.html", "utf-8");
        let resBody = htmlPage
          .replace(/#{roomName}/g,currentRoom.name)
          .replace(/#{inventory}/g,player.inventoryToString())
          .replace(/#{roomItems}/g,currentRoom.itemsToString())
          .replace(/#{exits}/g, currentRoom.exitsToString());
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        res.end(resBody);
        return;
    }



      if (req.method === 'GET' && req.url.startsWith("/rooms/") && urlParts.length === 4){
        let roomId = urlParts[2];
        let direction = urlParts[3];
        const currentRoom = world.rooms[roomId];

        if (currentRoom !== player.currentRoom) {
    
          // If room is not  current player's room, redirect to current room 
          res.statusCode = 302
          res.setHeader('Location', "/rooms/" + player.currentRoom["id"]);
          // finish
          res.end()
          return;
        }
       
        try{
          player.move(direction[0])
       
         
        } catch (error) {

          errorMessage = error;
          res.statusCode = 302
          res.setHeader('Location', "/error");
          res.end()
          return;
          
        }
      }
    
    

    
    // Phase 5: POST /items/:itemId/:action

    if(req.method === 'POST' && req.url.startsWith("/items/") && urlParts.length === 4){
      let itemId = urlParts[2];
      let action = urlParts[3];
      switch (action) {
        case 'drop':
          player.dropItem(itemId);
          break;
        case 'eat':
          try {
            player.eatItem(itemId);
          } catch (error) {

            errorMessage = error;
            res.statusCode = 302
            res.setHeader('Location', "/error");
            res.end()
            return;
          };
          break;
        case 'take':
          player.takeItem(itemId);
      }
      
      res.statusCode = 302
      res.setHeader('Location', "/rooms/" + player.currentRoom["id"]);
      // finish
      res.end()
      return;
    
    
    }

    // Phase 6: Redirect if no matching route handlers
    if (req.method === 'GET' && req.url === '/error') { //error page html

      
      // read template
      let htmlTemplate = fs.readFileSync('./views/error.html', 'utf-8')
      // replace variables:

      let resultHtml = htmlTemplate
        .replace(/#{errorMessage}/g, errorMessage)
        .replace(/#{roomId}/g, player.currentRoom.id)
      // set res
      res.statusCode = 200; // ok
      res.setHeader('Content-type', 'text/html');
      res.write(resultHtml);
      return res.end(); // can be res.end() only      
    }
  })
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));