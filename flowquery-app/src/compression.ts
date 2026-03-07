export async function compressString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const stream = new Blob([encoder.encode(str)])
        .stream()
        .pipeThrough(new CompressionStream("deflate-raw"));
    const compressedBlob = await new Response(stream).blob();
    const buffer = await compressedBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function decompressString(compressed: string): Promise<string> {
    let base64 = compressed.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const decompressedBlob = await new Response(stream).blob();
    return await decompressedBlob.text();
}
