import { redirect } from 'next/navigation';

interface CategoriaPageProps {
  params: {
    slug: string;
  };
}

export default function CategoriaRedirectPage({ params }: CategoriaPageProps) {
  redirect(`/busca?categoria=${encodeURIComponent(params.slug)}`);
}
