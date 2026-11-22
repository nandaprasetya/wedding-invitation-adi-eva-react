import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getInvitation, postWish } from '../services/api';
import { getTemplateComponent } from '../templates/components';

export default function InvitationPage({ defaultSlug = '' }) {
  const { slug: routeSlug } = useParams();
  const [searchParams] = useSearchParams();
  const slug = (routeSlug || defaultSlug || 'adi-eva').toLowerCase();
  const guestName = searchParams.get('to')?.trim() || 'Tamu Undangan';
  const previewToken = searchParams.get('preview')?.trim() || '';

  const [state, setState] = useState({
    loading: true,
    error: '',
    notFound: false,
    expired: false,
    invitation: null,
    wishes: [],
    isPreview: false,
  });

  useEffect(() => {
    let active = true;
    setState((prev) => ({
      ...prev,
      loading: true,
      error: '',
      notFound: false,
      expired: false,
    }));

    getInvitation(slug, previewToken)
      .then((data) => {
        if (!active) return;
        const inv = data?.invitation || null;
        if (inv) {
          document.title = inv.og_title || `Undangan ${inv.title} — Ansel Moments`;
        }
        setState({
          loading: false,
          error: '',
          notFound: !inv,
          expired: false,
          invitation: inv,
          wishes: Array.isArray(data?.wishes) ? data.wishes : [],
          isPreview: Boolean(data?.isPreview),
        });
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 410) {
          setState({
            loading: false,
            error: err.message,
            notFound: false,
            expired: true,
            invitation: null,
            wishes: [],
            isPreview: false,
          });
          return;
        }
        if (err.status === 404) {
          setState({
            loading: false,
            error: '',
            notFound: true,
            expired: false,
            invitation: null,
            wishes: [],
            isPreview: false,
          });
          return;
        }
        setState({
          loading: false,
          error: err.message || 'Gagal memuat undangan.',
          notFound: false,
          expired: false,
          invitation: null,
          wishes: [],
          isPreview: false,
        });
      });

    return () => {
      active = false;
    };
  }, [slug, previewToken]);

  const handleSubmitWish = async ({ guestName: authorName, message, attendance }) => {
    const res = await postWish(
      slug,
      {
        guestName: authorName,
        message,
        attendance,
      },
      previewToken
    );
    if (res?.wish) {
      setState((prev) => ({
        ...prev,
        wishes: [res.wish, ...prev.wishes],
      }));
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center font-dm text-sm text-[#EAE6DF]">
        Memuat undangan...
      </div>
    );
  }

  if (state.expired || state.notFound || state.error || !state.invitation) {
    return (
      <div className="min-h-screen bg-goldSand-50 font-dm text-codGray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white border border-codGray-100 p-8 text-center space-y-4">
          <h1 className="font-ibarra text-3xl font-semibold text-codGray-950">
            {state.expired
              ? 'Masa Aktif Undangan Berakhir'
              : state.notFound
                ? 'Undangan Tidak Ditemukan'
                : 'Terjadi Kendala'}
          </h1>
          <p className="text-sm text-codGray-500 leading-relaxed">
            {state.expired
              ? 'Masa tayang undangan digital ini telah berakhir. Hubungi admin Ansel Moments jika ingin memperpanjang masa aktif.'
              : state.error ||
                `Undangan dengan alamat /${slug} belum tersedia atau belum dipublikasikan.`}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/adi-eva"
              className="rounded-2xl border border-codGray-900 px-5 py-2.5 text-sm font-medium text-codGray-900 hover:bg-codGray-50"
            >
              Lihat Contoh Undangan
            </Link>
            <Link
              to="/order"
              className="rounded-2xl bg-goldSand-300 hover:bg-goldSand-400 px-5 py-2.5 text-sm font-medium text-codGray-950"
            >
              Pesan Undangan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const TemplateComponent = getTemplateComponent(
    state.invitation.renderer_key || state.invitation.template_id
  );
  return (
    <TemplateComponent
      invitation={state.invitation}
      guestName={guestName}
      wishes={state.wishes}
      onSubmitWish={handleSubmitWish}
      isPreview={state.isPreview}
    />
  );
}
