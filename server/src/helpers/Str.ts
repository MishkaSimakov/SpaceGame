export function capitalize(value: string) {
    if (!value) {
        return value;
    }

    return value[0].toUpperCase() + value.substring(1);
}