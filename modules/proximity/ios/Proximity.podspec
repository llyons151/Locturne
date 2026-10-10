Pod::Spec.new do |s|
  s.name           = 'Proximity'
  s.version        = '1.0.0'
  s.summary        = 'Push-ups: the proximity sensor, and Loc saying the count out loud.'
  s.author         = 'Locturne'
  s.homepage       = 'https://github.com/llyons151/locturne'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.frameworks = 'UIKit', 'AVFoundation'
  s.source_files = "**/*.{h,m,swift}"
end
