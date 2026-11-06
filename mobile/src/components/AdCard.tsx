import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import {
  formatCurrencyBRL,
  formatRelativeDate,
  formatCountdown,
  type AnuncioCard,
} from '@olx-clone/shared';
import { MapPin, Gavel, Repeat, Clock } from 'lucide-react-native';

interface AdCardProps {
  anuncio: AnuncioCard;
  onPress: () => void;
}

export function AdCard({ anuncio, onPress }: AdCardProps) {
  const isLeilao = anuncio.modalidade === 'leilao';
  const aceitaTroca = Boolean(anuncio.aceita_troca);
  const countdown = isLeilao ? formatCountdown(anuncio.leilao_encerramento) : null;
  const precoExibicao = isLeilao
    ? anuncio.lance_atual || anuncio.lance_inicial || anuncio.preco
    : anuncio.preco;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        anuncio.destacado_vitrine && styles.cardDestacado,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Imagem WebP */}
      <View style={styles.imageContainer}>
        {anuncio.foto_principal_url ? (
          <Image source={{ uri: anuncio.foto_principal_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Sem foto</Text>
          </View>
        )}

        {/* Badges no topo da imagem */}
        <View style={styles.topBadgesRow}>
          {anuncio.destacado_vitrine && (
            <View
              style={[
                styles.destaqueBadge,
                anuncio.tipo_destaque === 'global' && styles.destaqueGlobalBadge,
              ]}
            >
              <Text style={styles.destaqueBadgeText}>
                {anuncio.tipo_destaque === 'global' ? '👑 DESTAQUE GLOBAL' : '🔥 DESTAQUE'}
              </Text>
            </View>
          )}

          {isLeilao && (
            <View style={styles.auctionBadge}>
              <Gavel size={11} color="#FFF" />
              <Text style={styles.badgeText}>Leilão Ativo</Text>
            </View>
          )}

          {aceitaTroca && (
            <View style={styles.tradeBadge}>
              <Repeat size={11} color="#FFF" />
              <Text style={styles.badgeText}>Aceita Troca</Text>
            </View>
          )}
        </View>

        {anuncio.categoria_nome && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{anuncio.categoria_nome}</Text>
          </View>
        )}

        {isLeilao && countdown && (
          <View style={styles.countdownBadge}>
            <Clock size={10} color="#FFD180" />
            <Text style={styles.countdownText}>{countdown.formatted}</Text>
          </View>
        )}
      </View>

      {/* Conteúdo */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {anuncio.titulo}
        </Text>

        {isLeilao ? (
          <View style={styles.auctionPriceContainer}>
            <Text style={styles.auctionPriceLabel}>LANCE ATUAL</Text>
            <Text style={styles.auctionPriceText}>{formatCurrencyBRL(precoExibicao)}</Text>
          </View>
        ) : (
          <Text style={styles.price}>{formatCurrencyBRL(precoExibicao)}</Text>
        )}

        <View style={styles.footerRow}>
          <View style={styles.locationRow}>
            <MapPin size={12} color="#6C757D" />
            <Text style={styles.locationText} numberOfLines={1}>
              {anuncio.cidade}, {anuncio.estado}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatRelativeDate(anuncio.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardDestacado: {
    borderWidth: 2,
    borderColor: '#FFB300',
    shadowColor: '#FFB300',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  destaqueBadge: {
    backgroundColor: '#FF8F00',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  destaqueGlobalBadge: {
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: '#FFA000',
  },
  destaqueBadgeText: {
    color: '#3E2723',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#F8F9FA',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#ADB5BD',
    fontSize: 12,
  },
  topBadgesRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  auctionBadge: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  tradeBadge: {
    backgroundColor: '#00C853',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  countdownBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    gap: 4,
  },
  countdownText: {
    color: '#FFD180',
    fontSize: 10,
    fontWeight: '600',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    color: '#2D2D2D',
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B1B1B',
    marginBottom: 8,
  },
  auctionPriceContainer: {
    marginBottom: 8,
  },
  auctionPriceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B00',
    letterSpacing: 0.5,
  },
  auctionPriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B00',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    paddingTop: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  locationText: {
    fontSize: 11,
    color: '#6C757D',
  },
  dateText: {
    fontSize: 10,
    color: '#ADB5BD',
  },
});
