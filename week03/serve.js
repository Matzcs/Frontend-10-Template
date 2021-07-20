const http = require("http");

http
    .createServer((request, response) => {
        let body = [];
        request
            .on("error", (err) => {
                console.err(err);
            })
            .on("data", (chunk) => {
                body.push(chunk);
            })
            .on("end", () => {
                body = Buffer.concat(body).toString();
                console.log("body:", body);
                response.writeHead(200, { "Content-Type": "text/html" });
                response.end(`
<html lang="en">
  <head>
    <style>
      .container {
        width: 500px;
        height: 300px;
        display: flex;
        background-color: rgb(255,255,255);
      }
      body div #myId {
        width: 200px;
        height: 100px;
        background-color: rgb(255,0,0);
      }
      body div.container .myClass {
        flex: 1;
        background-color: rgb(0,255,0);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div id="myId"></div>
      <div class="myClass"></div>
    </div>
  </body>
</html>`);
            });
    })
    .listen(8080);

console.log("server started.");