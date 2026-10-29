import Foundation

registerTests()
registerShieldTapTests()
registerRehearsalTests()
registerRobustnessTests()
registerKnownCrashTests()
registerFixtureTests()
registerWakeFixtureTests()
let failures = runTests(filter: CommandLine.arguments.dropFirst().first)
exit(failures == 0 ? 0 : 1)
