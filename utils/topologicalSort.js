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
    let connections = []
    for (let edge of edges) {
        let a = nodeIndices[edge['source_table']]
        let b = nodeIndices[edge['target_table']]
        connections.push([a, b])
    }
    let outDegreeCount = new Array(vertices.length).fill(0)
    let indegreeNodes = []
    for (let n = 0; n < vertices.length; n++)indegreeNodes[n] = []
    for (let edge of connections) {
        outDegreeCount[edge[0]]++
        indegreeNodes[edge[1]].push(edge[0])
    }
    let queue = []
    let res = []
    for (let node = 0; node < vertices.length; node++) {
        if (outDegreeCount[node] == 0) {
            queue.push(node)
            break
        }
    }
    let taken = new Set()
    while (queue.length) {
        let top = queue.shift()
        res.push(top)
        taken.add(top)
        if (indegreeNodes[top].length == 0) {
            for (let node = 0; node < vertices.length; node++) {
                if (outDegreeCount[node] == 0 && !taken.has(node)) {
                    queue.push(node)
                    taken.add(node)
                    break
                }
            }
            continue;
        }
        let found = 0
        for (let adj of indegreeNodes[top]) {
            outDegreeCount[adj]--
            if (outDegreeCount[adj] == 0) {
                queue.push(adj * 1)
                taken.add(adj)

                found = 1
            }
        }
        if (found == 0) {
            for (let node = 0; node < vertices.length; node++) {
                if (outDegreeCount[node] == 0 && !taken.has(node)) {
                    queue.push(node)
                    taken.add(node)
                    break
                }
            }
            continue;
        }
    }
    return res.map(node => vertices[node])
}


module.exports = { topologicalSort }