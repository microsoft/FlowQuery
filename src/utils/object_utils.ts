class ObjectUtils {
    static isInstanceOfAny(obj: any, classes: any[]): boolean {
        return classes.some(cls => obj instanceof cls);
    }
}

export default ObjectUtils;