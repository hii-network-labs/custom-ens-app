'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useViemDomainStatus } from '@/hooks/useViemContract'
import { useUserDomains } from '@/hooks/useENS'
import { getAvailableTLDConfigsSync, getTLDConfigSync, formatFullDomain, getTLDColorClasses } from '../config/tlds'
import { InlineLoader } from './LoadingState'

interface DomainSuggestion {
  tld: string
  fullDomain: string
  isAvailable: boolean | null
  isLoading: boolean
  color: string
  description: string
}

interface DomainAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onDomainSelect: (domainName: string, tld: string) => void
  placeholder?: string
}

export default function DomainAutocomplete({ 
  value, 
  onChange, 
  onDomainSelect, 
  placeholder = "Enter domain name" 
}: DomainAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<DomainSuggestion[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const availableTLDConfigs = getAvailableTLDConfigsSync()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Generate suggestions when domain name changes
  useEffect(() => {
    if (value.trim().length > 0) {
      const newSuggestions = availableTLDConfigs.map(config => ({
        tld: config.tld,
        fullDomain: formatFullDomain(value, config.tld),
        isAvailable: null,
        isLoading: true,
        color: config.color || 'blue',
        description: config.description
      }))
      setSuggestions(newSuggestions)
      setIsOpen(true)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [value, availableTLDConfigs])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')
    onChange(newValue)
  }

  const handleSuggestionClick = (suggestion: DomainSuggestion) => {
    onDomainSelect(value, suggestion.tld)
    setIsOpen(false)
  }

  const handleInputFocus = () => {
    if (value.trim().length > 0) {
      setIsOpen(true)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="w-full px-6 py-4 text-xl font-medium bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:border-blue-300 focus:border-blue-500 focus:outline-none transition-all duration-200 placeholder-gray-400"
          placeholder={placeholder}
        />
        {value && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-80 overflow-y-auto"
        >
          <div className="p-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-600">Available domains for &quot;{value}&quot;</p>
          </div>
          
          <div className="py-2">
            {suggestions.map((suggestion) => (
              <DomainSuggestionItem
                key={suggestion.tld}
                suggestion={suggestion}
                domainName={value}
                onClick={() => handleSuggestionClick(suggestion)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface DomainSuggestionItemProps {
  suggestion: DomainSuggestion
  domainName: string
  onClick: () => void
}

function DomainSuggestionItem({ suggestion, domainName, onClick }: DomainSuggestionItemProps) {
  const { address } = useAccount()
  const { domains, loading: domainsLoading } = useUserDomains()
  const tldConfig = getTLDConfigSync(suggestion.tld)
  const { data: domainStatus, isLoading } = useViemDomainStatus(domainName, tldConfig)
  const isAvailable = domainStatus?.available ?? null
  
  // Check if this domain is in the user's owned domains list
  // Only check ownership if domains have finished loading and user is connected
  const isOwner = !domainsLoading && address && domains.some(domain => {
    // First check if this domain belongs to the current user (owner check is already done in useUserDomains)
    // Since useUserDomains already filters domains by ownership, any domain in the list is owned by the user
    
    // Check direct name match (if domain.name exists)
    const match1 = domain.name && domain.name.toLowerCase() === suggestion.fullDomain.toLowerCase()
    
    // Check constructed name from labelName + TLD
    const match2 = domain.labelName && `${domain.labelName}${suggestion.tld}`.toLowerCase() === suggestion.fullDomain.toLowerCase()
    
    // Also check if labelName matches the domain part (without TLD)
    const domainPart = suggestion.fullDomain.replace(suggestion.tld, '')
    const match3 = domain.labelName && domain.labelName.toLowerCase() === domainPart.toLowerCase()
    
    return match1 || match2 || match3
  })
  
  const colorClasses = getTLDColorClasses(suggestion.tld)

  const getStatusDisplay = () => {
    if (isLoading) {
      return {
        badge: (
          <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            Checking...
          </span>
        ),
        icon: <InlineLoader size="sm" />
      }
    }
    
    if (isAvailable === true) {
      return {
        badge: (
          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Available
          </span>
        ),
        icon: (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      }
    }
    
    if (isAvailable === false) {
      if (isOwner) {
        return {
          badge: (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              You Own This
            </span>
          ),
          icon: (
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )
        }
      } else {
        return {
          badge: (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
              Taken
            </span>
          ),
          icon: (
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        }
      }
    }

    return {
      badge: (
        <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
          Unknown
        </span>
      ),
      icon: (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div
      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
        isAvailable === false && !isOwner ? 'opacity-60 cursor-not-allowed' : ''
      }`}
      onClick={isAvailable !== false || isOwner ? onClick : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold text-gray-900">
              {suggestion.fullDomain}
            </span>
            <span className={`text-sm font-medium ${colorClasses.text}`}>
              {suggestion.tld}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {suggestion.description}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {statusDisplay.badge}
          {statusDisplay.icon}
        </div>
      </div>
    </div>
  )
}