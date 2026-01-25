/**
 * 
 * @param {[String]} vertices 
 * @param {[any]} edges 
 */
function topologicalSort(vertices, edges) {
    let nodeIndices = {}
    let index = 0
    for (let vertex of vertices) {
        nodeIndices[vertex] = index++
    }
    let stack = [];
    let graph = {}
    for (let node of vertices) graph[nodeIndices[node]] = []
    for (let edge of edges) {
        let a = nodeIndices[edge['source_table']] * 1;
        let b = nodeIndices[edge['target_table']] * 1;
        if (a == b) continue;
        if (!graph[a]) graph[a] = [];
        graph[a].push(b);
    }

    const visited = new Set();
    function dfs(node) {
        visited.add(node * 1);
        const neighbors = graph[node] || [];
        for (let neighbor of neighbors) {
            if (!visited.has(neighbor * 1)) {
                dfs(neighbor);
            }
        }
        stack.push(node);
    }

    for (let node in graph) {
        if (!visited.has(node * 1)) {
            dfs(node);
        }
    }

    return stack.map(node => vertices[node])
}


module.exports = { topologicalSort }