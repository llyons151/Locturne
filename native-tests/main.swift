import Foundation

registerTests()
registerFixtureTests()
let failures = runTests(filter: CommandLine.arguments.dropFirst().first)
exit(failures == 0 ? 0 : 1)
