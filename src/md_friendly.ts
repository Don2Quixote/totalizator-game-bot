export default function md_friendly(str: string): string {
    return str
        .replace(/[_]/g, '\\_')
        .replace(/[*]/g, '\\*')
        .replace(/[\[]/g, '\\[')
        .replace(/[\]]/g, '\\]')
        .replace(/[\(]/g, '\\(')
        .replace(/[\)]/g, '\\)')
        .replace(/[~]/g, '\\~')
        .replace(/[`]/g, '\\`')
        .replace(/[>]/g, '\\>')
        .replace(/[#]/g, '\\#')
        .replace(/[+]/g, '\\+')
        .replace(/[-]/g, '\\-')
        .replace(/[=]/g, '\\=')
        .replace(/[|]/g, '\\|')
        .replace(/[{]/g, '\\{')
        .replace(/[}]/g, '\\}')
        .replace(/[\.]/g, '\\.')
        .replace(/[!]/g, '\\!');
}
