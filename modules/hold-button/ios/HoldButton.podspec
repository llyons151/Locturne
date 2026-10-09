Pod::Spec.new do |s|
  s.name           = 'HoldButton'
  s.version        = '1.0.0'
  s.summary        = 'Press-and-hold button: a fill that sweeps across the pill with a rising haptic.'
  s.author         = 'Locturne'
  s.homepage       = 'https://github.com/llyons151/locturne'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  s.frameworks = 'CoreHaptics', 'UIKit'
  s.source_files = "**/*.{h,m,swift}"
end
