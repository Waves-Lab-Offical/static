/*
 * malloc_server.c
 *
 * Simple TCP-based malloc service.
 *
 * Protocol (line-based, newline-terminated ASCII):
 *  ALLOC <name> <size>
 *  WRITE <name> <offset> <base64_data>
 *  READ  <name> <offset> <length>
 *  FREE  <name>
 *  LIST
 *  EXIT
 *
 * Responses (single line, newline-terminated):
 *  OK [<base64_data>]
 *  ERR <message>
 *
 * Notes:
 *  - Name is a single token (no spaces).
 *  - offset and length are decimal integers.
 *  - WRITE data is base64 (no spaces in token).
 *
 * Cross-platform (Winsock on Windows, BSD sockets on Unix).
 *
 * Compile:
 *  Linux: gcc malloc_server.c -o malloc_server
 *  Windows (MinGW/clang): clang malloc_server.c -o malloc_server.exe -lws2_32
 *
 * Run:
 *  ./malloc_server
 */

#define _POSIX_C_SOURCE 200112L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <inttypes.h>

#ifdef _WIN32
  #include <winsock2.h>
  #include <ws2tcpip.h>
  #pragma comment(lib, "ws2_32")
  typedef SOCKET sock_t;
  #define close_socket closesocket
#else
  #include <unistd.h>
  #include <arpa/inet.h>
  #include <sys/socket.h>
  #include <netinet/in.h>
  typedef int sock_t;
  #define INVALID_SOCKET -1
  #define SOCKET_ERROR -1
  #define close_socket close
#endif

#define PORT_STR "4000"
#define BACKLOG 5
#define BUFSIZE 8192

/* Simple allocation registry */
typedef struct AllocNode {
    char *name;
    void *ptr;
    size_t size;
    struct AllocNode *next;
} AllocNode;

static AllocNode *alloc_head = NULL;

static AllocNode* find_alloc(const char *name) {
    for (AllocNode *n = alloc_head; n; n = n->next) if (strcmp(n->name, name) == 0) return n;
    return NULL;
}

static int add_alloc(const char *name, size_t size) {
    if (find_alloc(name)) return -1;
    void *p = malloc(size ? size : 1); // don't request zero
    if (!p) return -2;
    AllocNode *n = (AllocNode*)malloc(sizeof(AllocNode));
    n->name = strdup(name);
    n->ptr = p;
    n->size = size;
    n->next = alloc_head;
    alloc_head = n;
    return 0;
}

static int remove_alloc(const char *name) {
    AllocNode **pp = &alloc_head;
    while (*pp) {
        if (strcmp((*pp)->name, name) == 0) {
            AllocNode *to = *pp;
            *pp = to->next;
            free(to->ptr);
            free(to->name);
            free(to);
            return 0;
        }
        pp = &((*pp)->next);
    }
    return -1;
}

/* base64 helpers (simple, no validation) */
static const char b64chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static char *base64_encode(const uint8_t *data, size_t len) {
    size_t out_len = ((len + 2) / 3) * 4;
    char *out = malloc(out_len + 1);
    if (!out) return NULL;
    char *p = out;
    size_t i;
    for (i = 0; i + 2 < len; i += 3) {
        uint32_t triple = (data[i] << 16) | (data[i+1] << 8) | data[i+2];
        *p++ = b64chars[(triple >> 18) & 0x3F];
        *p++ = b64chars[(triple >> 12) & 0x3F];
        *p++ = b64chars[(triple >> 6) & 0x3F];
        *p++ = b64chars[triple & 0x3F];
    }
    if (i < len) {
        int rem = len - i;
        uint32_t triple = (data[i] << 16) | (rem == 2 ? (data[i+1] << 8) : 0);
        *p++ = b64chars[(triple >> 18) & 0x3F];
        *p++ = b64chars[(triple >> 12) & 0x3F];
        if (rem == 2) *p++ = b64chars[(triple >> 6) & 0x3F];
        else *p++ = '=';
        *p++ = '=';
    }
    *p = 0;
    return out;
}

static int b64val(char c) {
    if (c >= 'A' && c <= 'Z') return c - 'A';
    if (c >= 'a' && c <= 'z') return c - 'a' + 26;
    if (c >= '0' && c <= '9') return c - '0' + 52;
    if (c == '+') return 62;
    if (c == '/') return 63;
    return -1;
}

static uint8_t *base64_decode(const char *in, size_t *out_len) {
    size_t len = strlen(in);
    if (len % 4 != 0) {
        *out_len = 0;
        return NULL;
    }
    size_t out_capacity = (len / 4) * 3;
    uint8_t *out = malloc(out_capacity);
    if (!out) { *out_len = 0; return NULL; }
    size_t i, o = 0;
    for (i = 0; i < len; i += 4) {
        int v0 = b64val(in[i]);
        int v1 = b64val(in[i+1]);
        int v2 = (in[i+2] == '=') ? -2 : b64val(in[i+2]);
        int v3 = (in[i+3] == '=') ? -2 : b64val(in[i+3]);
        if (v0 < 0 || v1 < 0 || (v2 < -1) || (v3 < -1)) { free(out); *out_len = 0; return NULL; }
        uint32_t triple = (v0 << 18) | (v1 << 12) | ((v2 > -1 ? v2 : 0) << 6) | (v3 > -1 ? v3 : 0);
        out[o++] = (triple >> 16) & 0xFF;
        if (v2 > -1) out[o++] = (triple >> 8) & 0xFF;
        if (v3 > -1) out[o++] = triple & 0xFF;
    }
    *out_len = o;
    return out;
}

/* send a formatted line (ends with \n) */
static int send_line(sock_t s, const char *fmt, ...) {
    char buf[BUFSIZE];
    va_list ap;
    va_start(ap, fmt);
    int n = vsnprintf(buf, sizeof(buf)-2, fmt, ap);
    va_end(ap);
    if (n < 0) return -1;
    buf[n++] = '\n';
#ifdef _WIN32
    int sent = (int)send(s, buf, n, 0);
#else
    int sent = (int)send(s, buf, n, 0);
#endif
    return (sent == n) ? 0 : -1;
}

/* read a line (blocking) until '\n'. Returns malloc'd string (without newline). Caller must free. */
static char* recv_line(sock_t s) {
    char *buf = malloc(BUFSIZE);
    if (!buf) return NULL;
    size_t cap = BUFSIZE, len = 0;
    while (1) {
        char c;
        int r = recv(s, &c, 1, 0);
        if (r <= 0) { free(buf); return NULL; }
        if (c == '\n') break;
        if (len + 1 >= cap) {
            cap *= 2;
            buf = realloc(buf, cap);
            if (!buf) return NULL;
        }
        buf[len++] = c;
    }
    buf[len] = 0;
    return buf;
}

/* Process a single command line and reply. */
static void handle_command(sock_t client, const char *line) {
    char *copy = strdup(line);
    char *tok = strtok(copy, " ");
    if (!tok) { send_line(client, "ERR empty"); free(copy); return; }

    if (strcmp(tok, "ALLOC") == 0) {
        char *name = strtok(NULL, " ");
        char *size_s = strtok(NULL, " ");
        if (!name || !size_s) { send_line(client, "ERR ALLOC usage"); free(copy); return; }
        size_t size = (size_t)strtoull(size_s, NULL, 10);
        int rc = add_alloc(name, size);
        if (rc == 0) send_line(client, "OK");
        else if (rc == -1) send_line(client, "ERR already_exists");
        else send_line(client, "ERR nomem");
    }
    else if (strcmp(tok, "WRITE") == 0) {
        char *name = strtok(NULL, " ");
        char *offset_s = strtok(NULL, " ");
        char *b64 = strtok(NULL, " ");
        if (!name || !offset_s || !b64) { send_line(client, "ERR WRITE usage"); free(copy); return; }
        AllocNode *n = find_alloc(name);
        if (!n) { send_line(client, "ERR not_found"); free(copy); return; }
        size_t offset = (size_t)strtoull(offset_s, NULL, 10);
        size_t data_len;
        uint8_t *data = base64_decode(b64, &data_len);
        if (!data) { send_line(client, "ERR bad_base64"); free(copy); return; }
        if (offset + data_len > n->size) { free(data); send_line(client, "ERR out_of_bounds"); free(copy); return; }
        memcpy((uint8_t*)n->ptr + offset, data, data_len);
        free(data);
        send_line(client, "OK");
    }
    else if (strcmp(tok, "READ") == 0) {
        char *name = strtok(NULL, " ");
        char *offset_s = strtok(NULL, " ");
        char *len_s = strtok(NULL, " ");
        if (!name || !offset_s || !len_s) { send_line(client, "ERR READ usage"); free(copy); return; }
        AllocNode *n = find_alloc(name);
        if (!n) { send_line(client, "ERR not_found"); free(copy); return; }
        size_t offset = (size_t)strtoull(offset_s, NULL, 10);
        size_t len = (size_t)strtoull(len_s, NULL, 10);
        if (offset + len > n->size) { send_line(client, "ERR out_of_bounds"); free(copy); return; }
        char *b64 = base64_encode((uint8_t*)n->ptr + offset, len);
        if (!b64) { send_line(client, "ERR nomem"); free(copy); return; }
        send_line(client, "OK %s", b64);
        free(b64);
    }
    else if (strcmp(tok, "FREE") == 0) {
        char *name = strtok(NULL, " ");
        if (!name) { send_line(client, "ERR FREE usage"); free(copy); return; }
        int rc = remove_alloc(name);
        if (rc == 0) send_line(client, "OK");
        else send_line(client, "ERR not_found");
    }
    else if (strcmp(tok, "LIST") == 0) {
        /* produce semi-colon separated: name:size */
        char out[BUFSIZE];
        size_t pos = 0;
        out[0] = 0;
        for (AllocNode *n = alloc_head; n; n = n->next) {
            int written = snprintf(out + pos, sizeof(out) - pos - 1, "%s:%zu;", n->name, n->size);
            if (written < 0) break;
            pos += written;
            if (pos + 100 >= sizeof(out)) break;
        }
        send_line(client, "OK %s", out);
    }
    else if (strcmp(tok, "EXIT") == 0) {
        send_line(client, "OK bye");
        /* client handler will close */
    }
    else {
        send_line(client, "ERR unknown_command");
    }

    free(copy);
}

int main(void) {
#ifdef _WIN32
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2,2), &wsa) != 0) {
        fprintf(stderr, "WSAStartup failed\n");
        return 1;
    }
#endif

    sock_t listen_sock = INVALID_SOCKET;
    struct addrinfo hints, *res = NULL;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_INET;        /* IPv4 only for simplicity */
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags = AI_PASSIVE;

    if (getaddrinfo(NULL, PORT_STR, &hints, &res) != 0) {
        perror("getaddrinfo");
        return 1;
    }

    listen_sock = socket(res->ai_family, res->ai_socktype, res->ai_protocol);
    if (listen_sock == INVALID_SOCKET) {
        perror("socket");
        freeaddrinfo(res);
        return 1;
    }

    int opt = 1;
    setsockopt(listen_sock, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));

    if (bind(listen_sock, res->ai_addr, (int)res->ai_addrlen) == SOCKET_ERROR) {
        perror("bind");
        close_socket(listen_sock);
        freeaddrinfo(res);
        return 1;
    }

    freeaddrinfo(res);

    if (listen(listen_sock, BACKLOG) == SOCKET_ERROR) {
        perror("listen");
        close_socket(listen_sock);
        return 1;
    }

    printf("malloc_server listening on 127.0.0.1:%s\n", PORT_STR);

    while (1) {
        struct sockaddr_in client_addr;
        socklen_t addrlen = sizeof(client_addr);
        sock_t client = accept(listen_sock, (struct sockaddr*)&client_addr, &addrlen);
        if (client == INVALID_SOCKET) {
            perror("accept");
            continue;
        }
        printf("Client connected\n");

        /* handle commands until client disconnects */
        while (1) {
            char *line = recv_line(client);
            if (!line) { printf("Client disconnected\n"); break; }
            handle_command(client, line);
            free(line);
        }
        close_socket(client);
    }

    close_socket(listen_sock);

#ifdef _WIN32
    WSACleanup();
#endif
    return 0;
}