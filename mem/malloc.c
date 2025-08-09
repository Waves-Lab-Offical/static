#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_ENTRIES 100
#define DATA_FILE "allocations.dat"

typedef struct {
    char name[256];
    size_t size;
    void* ptr;
    int is_freed;
} Allocation;

static Allocation allocations[MAX_ENTRIES];
static int alloc_count = 0;

// --- Persistence helpers ---

void save_allocations() {
    FILE* f = fopen(DATA_FILE, "wb");
    if (!f) {
        perror("Failed to open data file for writing");
        exit(1);
    }
    fwrite(&alloc_count, sizeof(int), 1, f);
    for (int i = 0; i < alloc_count; i++) {
        if (allocations[i].is_freed) continue;
        fwrite(allocations[i].name, sizeof(char), 256, f);
        fwrite(&allocations[i].size, sizeof(size_t), 1, f);
        fwrite(allocations[i].ptr, 1, allocations[i].size, f);
    }
    fclose(f);
}

void load_allocations() {
    FILE* f = fopen(DATA_FILE, "rb");
    if (!f) {
        // No file yet, no problem
        return;
    }

    fread(&alloc_count, sizeof(int), 1, f);
    if (alloc_count > MAX_ENTRIES) {
        fprintf(stderr, "Data file corrupted or too large\n");
        fclose(f);
        exit(1);
    }

    for (int i = 0; i < alloc_count; i++) {
        fread(allocations[i].name, sizeof(char), 256, f);
        fread(&allocations[i].size, sizeof(size_t), 1, f);
        allocations[i].ptr = malloc(allocations[i].size);
        if (!allocations[i].ptr) {
            fprintf(stderr, "Memory alloc failed on load\n");
            fclose(f);
            exit(1);
        }
        fread(allocations[i].ptr, 1, allocations[i].size, f);
        allocations[i].is_freed = 0;
    }
    fclose(f);
}

Allocation* find_allocation(const char* name) {
    for (int i = 0; i < alloc_count; i++) {
        if (!allocations[i].is_freed && strcmp(allocations[i].name, name) == 0) {
            return &allocations[i];
        }
    }
    return NULL;
}

void add_allocation(const char* name, void* ptr, size_t size) {
    if (alloc_count >= MAX_ENTRIES) {
        fprintf(stderr, "Max allocation entries reached.\n");
        exit(1);
    }
    strncpy(allocations[alloc_count].name, name, 255);
    allocations[alloc_count].name[255] = '\0';
    allocations[alloc_count].ptr = ptr;
    allocations[alloc_count].size = size;
    allocations[alloc_count].is_freed = 0;
    alloc_count++;
    save_allocations();
}

void free_allocation(const char* name) {
    Allocation* alloc = find_allocation(name);
    if (!alloc) {
        fprintf(stderr, "Allocation with name '%s' not found.\n", name);
        return;
    }
    free(alloc->ptr);
    alloc->is_freed = 1;
    save_allocations();
    printf("Freed allocation '%s'\n", name);
}

void print_value(const char* name) {
    Allocation* alloc = find_allocation(name);
    if (!alloc) {
        fprintf(stderr, "Allocation with name '%s' not found.\n", name);
        return;
    }
    if (alloc->size < sizeof(int)) {
        fprintf(stderr, "Allocation too small to contain int value.\n");
        return;
    }
    int* val = (int*)alloc->ptr;
    printf("Value stored in '%s': %d\n", name, *val);
}

int main(int argc, char* argv[]) {
    load_allocations();

    if (argc < 2) {
        printf("Usage:\n");
        printf("  %s <DATA_TYPE> <SIZE_IN_BYTES> <NAME> <VALUE>\n", argv[0]);
        printf("  %s <NAME> --free\n", argv[0]);
        printf("  %s <NAME> --value\n", argv[0]);
        return 1;
    }

    if (argc == 2) {
        // Only name given, missing action
        fprintf(stderr, "Missing action flag (--free or --value)\n");
        return 1;
    }

    if (argc == 3) {
        char* name = argv[1];
        char* action = argv[2];
        if (strcmp(action, "--free") == 0) {
            free_allocation(name);
            return 0;
        } else if (strcmp(action, "--value") == 0) {
            print_value(name);
            return 0;
        } else {
            fprintf(stderr, "Unknown action: %s\n", action);
            return 1;
        }
    }

    if (argc == 5) {
        char* data_type = argv[1];
        size_t size = (size_t)atoi(argv[2]);
        char* name = argv[3];
        char* value_str = argv[4];

        if (strcmp(data_type, "int") == 0) {
            if (find_allocation(name)) {
                fprintf(stderr, "Allocation with name '%s' already exists.\n", name);
                return 1;
            }

            void* ptr = malloc(size);
            if (!ptr) {
                fprintf(stderr, "Memory allocation failed.\n");
                return 1;
            }
            memset(ptr, 0, size);

            int value = atoi(value_str);
            if (size >= sizeof(int)) {
                *(int*)ptr = value;
            }

            add_allocation(name, ptr, size);

            printf("Allocated %zu bytes for '%s' with initial int value %d\n", size, name, value);
            return 0;
        } else {
            fprintf(stderr, "Unsupported data type '%s' (only int supported).\n", data_type);
            return 1;
        }
    }

    fprintf(stderr, "Invalid arguments.\n");
    return 1;
}