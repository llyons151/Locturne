Pod::Spec.new do |s|
  s.name           = 'PlaceSearch'
  s.version        = '1.0.0'
  s.summary        = 'Leave the house: Apple Maps search for places, and a map picture of the one picked.'
  s.author         = 'Locturne'
  s.homepage       = 'https://github.com/llyons151/locturne'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.frameworks = 'MapKit', 'UIKit'
  s.source_files = "**/*.{h,m,swift}"
end
