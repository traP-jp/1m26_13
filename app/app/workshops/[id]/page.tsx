import type { Metadata } from 'next';
import { getWorkshopDetail } from '../../../db/repository';
import { parsePositiveId } from '../../../lib/domain';
import VueIsland from '../../vue-island';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const workshop = await getWorkshopDetail(parsePositiveId(id, '講習会'));
    const title = `${workshop.title} | 1-Monthon β`;
    return {
      title,
      description: workshop.summary,
      openGraph: { title, description: workshop.summary, images: ['/og.png'] },
      twitter: {
        card: 'summary_large_image',
        title,
        description: workshop.summary,
        images: ['/og.png'],
      },
    };
  } catch {
    return { title: '講習会が見つかりません | 1-Monthon β' };
  }
}

export default function WorkshopDetailPage() {
  return <VueIsland />;
}
