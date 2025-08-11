// malloc_client.js
// A tiny Node client for the malloc_server protocol on 127.0.0.1:4000
// Usage: node malloc_client.js  (has demo usage at bottom)

const net = require('net');

function sendAndRecv(host, port, message) {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port }, () => {
            socket.write(message + '\n');
        });

        socket.setEncoding('utf8');
        let data = '';
        socket.on('data', chunk => {
            data += chunk;
            if (data.endsWith('\n')) {
                socket.end();
            }
        });

        socket.on('end', () => {
            const line = data.trim();
            if (line.startsWith('OK')) {
                const rest = line.length > 2 ? line.slice(3) : '';
                resolve({ ok: true, data: rest });
            } else if (line.startsWith('ERR')) {
                resolve({ ok: false, err: line.slice(4) });
            } else {
                resolve({ ok: false, err: 'invalid response' });
            }
        });

        socket.on('error', err => {
            reject(err);
        });
    });
}

function alloc(name, size) {
    return sendAndRecv('127.0.0.1', 4000, `ALLOC ${name} ${size}`);
}

function freeAlloc(name) {
    return sendAndRecv('127.0.0.1', 4000, `FREE ${name}`);
}

function listAll() {
    return sendAndRecv('127.0.0.1', 4000, `LIST`);
}

function writeData(name, offset, buffer) {
    const b64 = buffer.toString('base64');
    // ensure no newlines
    const token = b64.replace(/\n/g, '');
    return sendAndRecv('127.0.0.1', 4000, `WRITE ${name} ${offset} ${token}`);
}

function readData(name, offset, length) {
    return sendAndRecv('127.0.0.1', 4000, `READ ${name} ${offset} ${length}`)
        .then(res => {
            if (!res.ok) return res;
            const b64 = res.data.trim();
            if (b64.length === 0) return { ok: true, buffer: Buffer.alloc(0) };
            const buf = Buffer.from(b64, 'base64');
            return { ok: true, buffer: buf };
        });
}

// simple demo if run directly
if (require.main === module) {
    (async () => {
        try {
            console.log('Allocating "age" size 4');
            console.log(await alloc('age', 4));
            const buf = Buffer.alloc(4);
            buf.writeUInt32LE(30, 0);
            console.log('Writing 30 to age');
            console.log(await writeData('age', 0, buf));
            console.log('Reading age');
            let r = await readData('age', 0, 4);
            if (r.ok) console.log('Raw bytes:', r.buffer, 'value:', r.buffer.readUInt32LE(0));
            console.log('Listing allocations:');
            console.log(await listAll());
            console.log('Freeing age:');
            console.log(await freeAlloc('age'));
        } catch (e) {
            console.error('Error:', e);
        }
    })();
}

module.exports = { alloc, freeAlloc, listAll, writeData, readData };