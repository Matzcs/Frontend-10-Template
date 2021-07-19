const http = require('http')

http.createServer((req, resp) => {
    let body = []
    req.on('error', err => {
        console.log(err)
    }).on('data', chunk => {
        //console.log(chunk.toString())
        body.push(chunk)
    }).on('end', () => {
        body = Buffer.concat(body).toString()
        console.log("body:", body)
        resp.writeHead(200, {'Content-Type': 'text/html'});
        resp.end(`<html maaa=a >
<head>
    <style>
body div #myid {
    width: 100px;
    background-color: #ff5000;
}
body div img {
    width: 30px;
    background-color: #ff1111;
}
    </style>
</head>
<body>
    <div>
        <img id="myid"/>
        <img />
    </div>
</body>
</html>`)
    })
}).listen(8088)

console.log('server started')