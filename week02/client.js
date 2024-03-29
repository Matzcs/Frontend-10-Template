const net = require('net')
const parser = require('./parser.js')

class Request {
    constructor(options) {
        this.method = options.method || 'GET'
        this.host = options.host
        this.port = options.port || 80
        this.path = options.path || '/'
        this.body = options.body || {}
        this.headers = options.headers || {}
        if (!this.headers['Content-Type']) {
            this.headers['Content-Type'] = 'application/x-www-form-urlencoded'
        }

        if (this.headers['Content-Type'] === 'application/json') {
            this.bodyText = JSON.stringify(this.body)
        } else if (this.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
            this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&')
        }
        this.headers['Content-Length'] = this.bodyText.length
    }

    send(connection) {
        return new Promise((resolve, reject) => {
            const responseParser = new ResponseParser()
            if (connection) {
                connection.write(this.toString())
            } else {
                connection = net.createConnection({
                    host: this.host,
                    port: this.port
                }, () => {
                    connection.write(this.toString())
                })
            }
            connection.on('data', data => {
                //console.log(data.toString())
                responseParser.receive(data.toString())
                if (responseParser.isFinished) {
                    resolve(responseParser.response)
                    connection.end()
                }
            })
            connection.on('error', err => {
                reject(err)
                connection.end()
            })
        })
    }

    toString() {
        return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
\r
${this.bodyText}`
    }
}

class ResponseParser {
    constructor() {
        this.WAITING_STATUS_LINE = 0
        this.WAITING_STATUS_LINE_END = 1
        this.WAITING_HEADER_NAME = 2
        this.WAITING_HEADER_SPACE = 3
        this.WAITING_HEADER_VALUE = 4
        this.WAITING_HEADER_LINE_END = 5
        this.WAITING_HEADER_BLOCK_END = 6
        this.WAITING_BODY = 7

        this.current = this.WAITING_STATUS_LINE
        this.statusLine = ''
        this.headers = {}
        this.headerName = ''
        this.headerValue = ''
        this.bodyParser = null
    }

    get isFinished() {
        return this.bodyParser && this.bodyParser.isFinished
    }

    get response() {
        this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/)
        return {
            statusCode: RegExp.$1,
            statusText: RegExp.R2,
            headers: this.headers,
            body: this.bodyParser.content.join('')
        }
    }

    receive(string) {
        for (let i = 0; i < string.length; i++) {
            this.receiveChar(string.charAt(i))
        }
    }

    receiveChar(ch) {
        if (this.current === this.WAITING_STATUS_LINE) {
            if (ch === '\r') {
                this.current = this.WAITING_STATUS_LINE_END
            } else {
                this.statusLine += ch
            }
        } else if (this.current === this.WAITING_STATUS_LINE_END) {
            if (ch === '\n') {
                this.current = this.WAITING_HEADER_NAME
            }
        } else if (this.current === this.WAITING_HEADER_NAME) {
            if (ch === ':') {
                this.current = this.WAITING_HEADER_SPACE
            } else if (ch === '\r') {
                this.current = this.WAITING_HEADER_BLOCK_END
                if (this.headers['Transfer-Encoding'] === 'chunked') {
                    this.bodyParser = new TrunkedBodyParser()
                }
            } else {
                this.headerName += ch
            }
        } else if (this.current === this.WAITING_HEADER_SPACE) {
            if (ch === ' ') {
                this.current = this.WAITING_HEADER_VALUE
            }
        } else if (this.current === this.WAITING_HEADER_VALUE) {
            if (ch === '\r') {
                this.current = this.WAITING_HEADER_LINE_END
                this.headers[this.headerName] = this.headerValue
                this.headerName = ''
                this.headerValue = ''
            } else {
                this.headerValue += ch
            }
        } else if (this.current === this.WAITING_HEADER_LINE_END) {
            if (ch === '\n') {
                this.current = this.WAITING_HEADER_NAME
            }
        } else if (this.current === this.WAITING_HEADER_BLOCK_END) {
            if (ch === '\n') {
                this.current = this.WAITING_BODY
            }
        } else if (this.current === this.WAITING_BODY) {
            this.bodyParser.receiveChar(ch)
        }
    }
}

class TrunkedBodyParser {
    constructor() {
        this.WAITING_LENGTH = 0
        this.WAITING_LENGTH_LINE_END = 1 
        this.READING_TRUNK = 2
        this.WAITING_NEW_LINE = 3
        this.WAITING_NEW_LINE_END = 4

        this.length = 0
        this.content = []
        this.isFinished = false
        this.current = this.WAITING_LENGTH
    }

    receiveChar(ch) {
        if (this.current === this.WAITING_LENGTH) {
            if (ch === '\r') {
                if (this.length === 0) {
                    this.isFinished = true
                }
                this.current = this.WAITING_LENGTH_LINE_END
            } else {
                this.length *= 16
                this.length += parseInt(ch, 16)
            }
        } else if (this.current === this.WAITING_LENGTH_LINE_END) {
            if (ch === '\n') {
                this.current = this.READING_TRUNK
            }
        } else if (this.current === this.READING_TRUNK) {
            this.content.push(ch)
            this.length--
            if (this.length === 0) {
                this.current = this.WAITING_NEW_LINE
            }
        } else if (this.current === this.WAITING_NEW_LINE) {
            if (ch === '\r') {
                this.current = this.WAITING_NEW_LINE_END
            }
        } else if (this.current === this.WAITING_NEW_LINE_END) {
            if (ch === '\n') {
                this.current = this.WAITING_LENGTH
            }
        }
    }
}

void async function run() {
    let request = new Request({
        method: 'POST',
        host: '127.0.0.1',
        port: '8088',
        path: '/',
        headers: {
            ['X-Foo2']: 'customed'
        },
        body: {
            name: 'winter'
        }
    })
    let response = await request.send()
    let dom = parser.parseHTML(response.body)
    console.log(JSON.stringify(dom, null, '    '))
}()