import { useQuery, useMutation } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { MY_LISTINGS, DELETE_LISTING } from './listings.gql';
import { REGISTER_DEVICE_TOKEN } from './notifications.gql';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { getFcmToken, listenForegroundMessages } from '../../notifications/fcm';
import { useEffect, useState } from 'react';

type Listing = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
  rejectionReason?: string;
  imageUrl?: string;
  isPremium?: boolean;
  viewCount?: number;
};

interface MyListingsData {
  myListings: Listing[];
}

export function MyListings() {
  const { data, loading, error, refetch } = useQuery<MyListingsData>(MY_LISTINGS);
  const [registerToken] = useMutation(REGISTER_DEVICE_TOKEN);
  const [deleteListing] = useMutation(DELETE_LISTING, {
    onCompleted: () => refetch()
  });
  
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'enabled' | 'failed'>('idle');

  useEffect(() => {
    listenForegroundMessages();
  }, []);

  async function enableNotifications() {
    const token = await getFcmToken();
    if (!token) {
      setTokenStatus('failed');
      return;
    }
    await registerToken({ variables: { token } });
    setTokenStatus('enabled');
  }

  async function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this listing?")) {
      await deleteListing({ variables: { id } });
    }
  }

  const listings = data?.myListings ?? [];

  return (
    <DashboardLayout
      title="My Listings"
      subtitle="Manage your experiences"
      actions={
        <>
          <Button
            variant="ghost"
            onClick={enableNotifications}
            disabled={tokenStatus === 'enabled'}
            className="text-white"
          >
            {tokenStatus === 'enabled' ? '🔔 Enabled' : 'Enable Notifications'}
          </Button>
          <Button variant="ghost" className="text-white" onClick={() => refetch()}>
            Refresh
          </Button>
          <Link to="/host/create">
            <Button variant="secondary">Create Listing</Button>
          </Link>
        </>
      }
    >
      <div className="mx-auto w-full max-w-7xl">
        {loading ? (
          <div className="text-sm text-slate-500 font-semibold mb-4">Loading listings...</div>
        ) : null}

        {error ? (
          <div className="rounded border-0 bg-red-100 p-4 text-sm font-bold text-red-800 shadow mb-4">
            {error.message}
          </div>
        ) : null}

        {tokenStatus === 'failed' ? (
          <div className="mb-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-700">
            Failed to get notification token. Check browser permissions.
          </div>
        ) : null}

        {!loading && listings.length === 0 ? (
          <Card className="text-center py-10">
            <div className="text-lg text-slate-500 font-bold mb-4">No listings found.</div>
            <Link to="/host/create">
              <Button>Create your first listing</Button>
            </Link>
          </Card>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Card key={l.id}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h6 className="text-lg font-bold text-slate-700 capitalize">{l.title}</h6>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-400">{l.type}</span>
                    {l.isPremium && (
                      <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                        Premium
                      </span>
                    )}
                  </div>
                </div>
                <Badge value={l.status} />
              </div>

              {l.imageUrl && (
                <img
                  src={l.imageUrl}
                  alt={l.title}
                  className="w-full h-40 object-cover mt-2 mb-3 rounded shadow-sm opacity-95 transition-opacity hover:opacity-100"
                />
              )}

              <p className="mt-2 mb-4 line-clamp-3 text-sm font-light leading-relaxed text-slate-600">
                {l.description}
              </p>

              {l.status === 'REJECTED' && l.rejectionReason && (
                <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-2 rounded shadow-sm border border-red-200">
                  Reason: {l.rejectionReason}
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400">
                    {new Date(l.createdAt).toLocaleDateString()}
                  </div>
                  {typeof l.viewCount === 'number' && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {l.viewCount} view{l.viewCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {l.status === 'APPROVED' && (
                    <Link to={`/listing/${l.id}`}>
                      <Button variant="ghost" className="!px-3 !py-1 !text-[10px] text-emerald-600">View</Button>
                    </Link>
                  )}
                  <Link to={`/host/edit/${l.id}`}>
                    <Button variant="ghost" className="!px-3 !py-1 !text-[10px] text-sky-600">Edit</Button>
                  </Link>
                  <Button
                    variant="danger"
                    className="!px-3 !py-1 !text-[10px]"
                    onClick={() => handleDelete(l.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
