Pod::Spec.new do |s|
  s.name           = 'MistDot'
  s.version        = '1.0.0'
  s.summary        = 'The mist in a won day on the week strip: a small fluid sim drawn with Metal.'
  s.author         = 'Locturne'
  s.homepage       = 'https://github.com/llyons151/locturne'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Always optimised, dev builds included: unoptimised, the fluid solver ran ~20x slower and
  # seven of them lagged the whole app.
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_OPTIMIZATION_LEVEL' => '-O',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'GCC_OPTIMIZATION_LEVEL' => '3',
  }

  s.frameworks = 'Metal', 'MetalKit', 'CoreMotion'
  s.source_files = "**/*.{h,m,swift}"
end
