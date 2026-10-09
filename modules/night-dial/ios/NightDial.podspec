Pod::Spec.new do |s|
  s.name           = 'NightDial'
  s.version        = '1.0.0'
  s.summary        = 'The Routine tab night dial: a 24-hour ring with draggable bedtime and morning start.'
  s.author         = 'Locturne'
  s.homepage       = 'https://github.com/llyons151/locturne'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  s.frameworks = 'UIKit'
  s.source_files = "**/*.{h,m,swift}"
end
