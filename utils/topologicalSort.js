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
    edges = structuredClone(edges)
    for (let edge of edges) {
        edge['source_table'] = nodeIndices[edge['source_table']]
        edge['target_table'] = nodeIndices[edge['target_table']]
    }
    let outDegreeCount = new Array(vertices.length).fill(0)
    let indegreeNodes = []
    for (let n = 0; n < vertices.length; n++)indegreeNodes[n] = []
    for (let edge of edges) {
        outDegreeCount[edge['source_table']]++
        indegreeNodes[edge['target_table']].push(edge['source_table'])
    }
    let queue = []
    let res = []
    for (let node = 0; node < vertices.length; node++) {
        if (outDegreeCount[node] == 0) {
            queue.push(node)
            break
        }
    }
    while (queue.length) {
        let top = queue.shift()
        res.push(top)
        for (let adj of indegreeNodes[top]) {
            outDegreeCount[adj]--
            if (outDegreeCount[adj] == 0)
                queue.push(adj * 1)
        }
    }
    return res.map(node => vertices[node])
}


module.exports = { topologicalSort }