'use client';

import { useEffect, useState } from 'react';
import { propertiesAPI, Property } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Building2, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const response = await propertiesAPI.list();
        setProperties(response.data);
      } catch (error) {
        console.error('Failed to load properties:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProperties();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your property portfolio
          </p>
        </div>
        <Link href="/properties/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </Link>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Link key={property.id} href={`/properties/${property.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <Building2 className="h-10 w-10 text-indigo-600" />
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {property.total_units} units
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {property.name}
                  </h3>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.city}, {property.state}
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {property.description || 'No description'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {property.amenities.slice(0, 3).map((amenity, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
