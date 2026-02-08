'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Lock, MapPin, Globe, Star, Calendar, ExternalLink } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { useMember, ROLE_LABELS, ROLE_COLORS } from '@/features/members';
import type { UserRole } from '@/types/database';

// Brand icons as simple text since we don't have react-icons
function TwitterIcon() {
  return <span className="text-xs font-bold">X</span>;
}
function DiscordIcon() {
  return <span className="text-xs font-bold">D</span>;
}

export default function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const locale = useLocale();
  const t = useTranslations('Members');
  const { data: member, isLoading } = useMember(id);

  if (isLoading) {
    return (
      <PageContainer width="narrow">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (!member) {
    return (
      <PageContainer width="narrow">
        <p className="text-gray-500">{t('memberNotFound')}</p>
      </PageContainer>
    );
  }

  if (!member.profile_visible) {
    return (
      <PageContainer width="narrow">
        <Link
          href={`/${locale}/members`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {t('backToDirectory')}
        </Link>
        <div className="text-center py-16">
          <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privateProfile')}</h2>
          <p className="text-gray-500">{t('privateProfileDescription')}</p>
        </div>
      </PageContainer>
    );
  }

  const displayName =
    member.name || (member.organic_id ? `ORG-${member.organic_id}` : t('anonymous'));

  return (
    <PageContainer width="narrow">
      {/* Back link */}
      <Link
        href={`/${locale}/members`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> {t('backToDirectory')}
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-5">
          {member.avatar_url ? (
            <Image
              src={member.avatar_url}
              alt={displayName}
              width={80}
              height={80}
              className="rounded-full object-cover border-2 border-gray-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-organic-orange to-organic-yellow flex items-center justify-center border-2 border-gray-100">
              <span className="text-white font-bold text-3xl">
                {displayName[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              {member.role && member.role !== 'guest' && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[member.role as UserRole]}`}
                >
                  {ROLE_LABELS[member.role as UserRole]}
                </span>
              )}
            </div>
            {member.organic_id && (
              <p className="text-sm text-gray-500 mt-0.5">ORG-{member.organic_id}</p>
            )}
            {member.bio && (
              <p className="text-gray-600 mt-3 text-sm leading-relaxed">{member.bio}</p>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-4 mt-5 text-sm text-gray-500">
          {member.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {member.location}
            </span>
          )}
          {member.website && (
            <a
              href={member.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-organic-orange"
            >
              <Globe className="w-3.5 h-3.5" /> {t('website')}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {member.twitter && (
            <a
              href={`https://x.com/${member.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-organic-orange"
            >
              <TwitterIcon /> @{member.twitter}
            </a>
          )}
          {member.discord && (
            <span className="flex items-center gap-1.5">
              <DiscordIcon /> {member.discord}
            </span>
          )}
          {member.created_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />{' '}
              {t('memberSince', {
                date: new Date(member.created_at).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'short',
                }),
              })}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <Star className="w-5 h-5 text-organic-orange mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{member.total_points}</p>
          <p className="text-sm text-gray-500">{t('totalPoints')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <Star className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{member.tasks_completed}</p>
          <p className="text-sm text-gray-500">{t('tasksCompleted')}</p>
        </div>
      </div>
    </PageContainer>
  );
}
