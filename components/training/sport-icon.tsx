import {
  BasketballIcon,
  BoxingGloveIcon,
  FootballIcon,
  MountainsIcon,
  PersonSimpleThrowIcon,
  RacquetIcon,
  SneakerMoveIcon,
  SoccerBallIcon,
  TennisBallIcon,
  VolleyballIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { Sport } from "@/lib/sports";

const ICONS: Record<Sport, Icon> = {
  padel: RacquetIcon,
  tennis: TennisBallIcon,
  squash: RacquetIcon,
  badminton: RacquetIcon,
  foot: SoccerBallIcon,
  basket: BasketballIcon,
  handball: PersonSimpleThrowIcon,
  rugby: FootballIcon,
  volley: VolleyballIcon,
  escalade: MountainsIcon,
  combat: BoxingGloveIcon,
  autre: SneakerMoveIcon,
};

/** Icône décorative du sport : le nom est toujours écrit à côté. */
export function SportIcon({ sport, size = 20 }: { sport: Sport; size?: number }) {
  const Glyph = ICONS[sport];
  return <Glyph size={size} aria-hidden="true" />;
}
