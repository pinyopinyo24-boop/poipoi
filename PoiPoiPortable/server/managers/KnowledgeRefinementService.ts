/**
 * KnowledgeRefinementService
 * 知識精緻化・知識グラフ管理・知識品質管理
 */

export interface KnowledgeEntity {
  entityId: string;
  timestamp: number;
  name: string;
  type: 'concept' | 'fact' | 'procedure' | 'principle' | 'rule';
  description: string;
  category: string;
  confidence: number; // 0-100
  sourceCount: number;
  lastUpdated: number;
  status: 'active' | 'archived' | 'disputed';
}

export interface KnowledgeRelation {
  relationId: string;
  timestamp: number;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: 'related' | 'causes' | 'requires' | 'contradicts' | 'similar';
  strength: number; // 0-100
  evidence: string;
  status: 'confirmed' | 'tentative' | 'disputed';
}

export interface KnowledgeRefinement {
  refinementId: string;
  timestamp: number;
  entityId: string;
  refinementType: 'clarification' | 'expansion' | 'correction' | 'consolidation';
  originalContent: string;
  refinedContent: string;
  improvementScore: number; // 0-100
  status: 'pending' | 'approved' | 'applied' | 'rejected';
}

export class KnowledgeRefinementService {
  private entities: Map<string, KnowledgeEntity> = new Map();
  private relations: Map<string, KnowledgeRelation> = new Map();
  private refinements: Map<string, KnowledgeRefinement> = new Map();
  private entitiesByCategory: Map<string, string[]> = new Map();
  private entitiesByType: Map<string, string[]> = new Map();
  private relationsBySource: Map<string, string[]> = new Map();
  private relationsByTarget: Map<string, string[]> = new Map();
  private refinementsByEntity: Map<string, string[]> = new Map();
  private refinementsByStatus: Map<string, string[]> = new Map();

  /**
   * 知識エンティティを作成
   */
  createKnowledgeEntity(
    name: string,
    type: 'concept' | 'fact' | 'procedure' | 'principle' | 'rule',
    description: string,
    category: string,
    confidence: number
  ): KnowledgeEntity {
    const entityId = `KE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const entity: KnowledgeEntity = {
      entityId,
      timestamp: Date.now(),
      name,
      type,
      description,
      category,
      confidence,
      sourceCount: 1,
      lastUpdated: Date.now(),
      status: 'active',
    };

    this.entities.set(entityId, entity);

    if (!this.entitiesByCategory.has(category)) {
      this.entitiesByCategory.set(category, []);
    }
    this.entitiesByCategory.get(category)!.push(entityId);

    if (!this.entitiesByType.has(type)) {
      this.entitiesByType.set(type, []);
    }
    this.entitiesByType.get(type)!.push(entityId);

    return entity;
  }

  /**
   * エンティティを取得
   */
  getKnowledgeEntity(entityId: string): KnowledgeEntity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * カテゴリ別エンティティを取得
   */
  getEntitiesByCategory(category: string): KnowledgeEntity[] {
    const ids = this.entitiesByCategory.get(category) || [];
    return ids
      .map(id => this.entities.get(id))
      .filter((e): e is KnowledgeEntity => e !== undefined);
  }

  /**
   * タイプ別エンティティを取得
   */
  getEntitiesByType(type: string): KnowledgeEntity[] {
    const ids = this.entitiesByType.get(type) || [];
    return ids
      .map(id => this.entities.get(id))
      .filter((e): e is KnowledgeEntity => e !== undefined);
  }

  /**
   * 知識関係を作成
   */
  createKnowledgeRelation(
    sourceEntityId: string,
    targetEntityId: string,
    relationType: 'related' | 'causes' | 'requires' | 'contradicts' | 'similar',
    strength: number,
    evidence: string
  ): KnowledgeRelation {
    const relationId = `KR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const relation: KnowledgeRelation = {
      relationId,
      timestamp: Date.now(),
      sourceEntityId,
      targetEntityId,
      relationType,
      strength,
      evidence,
      status: 'tentative',
    };

    this.relations.set(relationId, relation);

    if (!this.relationsBySource.has(sourceEntityId)) {
      this.relationsBySource.set(sourceEntityId, []);
    }
    this.relationsBySource.get(sourceEntityId)!.push(relationId);

    if (!this.relationsByTarget.has(targetEntityId)) {
      this.relationsByTarget.set(targetEntityId, []);
    }
    this.relationsByTarget.get(targetEntityId)!.push(relationId);

    return relation;
  }

  /**
   * 関係を取得
   */
  getKnowledgeRelation(relationId: string): KnowledgeRelation | undefined {
    return this.relations.get(relationId);
  }

  /**
   * ソース別関係を取得
   */
  getRelationsBySource(sourceEntityId: string): KnowledgeRelation[] {
    const ids = this.relationsBySource.get(sourceEntityId) || [];
    return ids
      .map(id => this.relations.get(id))
      .filter((r): r is KnowledgeRelation => r !== undefined);
  }

  /**
   * ターゲット別関係を取得
   */
  getRelationsByTarget(targetEntityId: string): KnowledgeRelation[] {
    const ids = this.relationsByTarget.get(targetEntityId) || [];
    return ids
      .map(id => this.relations.get(id))
      .filter((r): r is KnowledgeRelation => r !== undefined);
  }

  /**
   * 関係を確認
   */
  confirmKnowledgeRelation(relationId: string): boolean {
    const relation = this.relations.get(relationId);
    if (!relation) return false;

    relation.status = 'confirmed';
    return true;
  }

  /**
   * 精緻化を作成
   */
  createRefinement(
    entityId: string,
    refinementType: 'clarification' | 'expansion' | 'correction' | 'consolidation',
    originalContent: string,
    refinedContent: string,
    improvementScore: number
  ): KnowledgeRefinement {
    const refinementId = `KF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const refinement: KnowledgeRefinement = {
      refinementId,
      timestamp: Date.now(),
      entityId,
      refinementType,
      originalContent,
      refinedContent,
      improvementScore,
      status: 'pending',
    };

    this.refinements.set(refinementId, refinement);

    if (!this.refinementsByEntity.has(entityId)) {
      this.refinementsByEntity.set(entityId, []);
    }
    this.refinementsByEntity.get(entityId)!.push(refinementId);

    if (!this.refinementsByStatus.has('pending')) {
      this.refinementsByStatus.set('pending', []);
    }
    this.refinementsByStatus.get('pending')!.push(refinementId);

    return refinement;
  }

  /**
   * 精緻化を取得
   */
  getRefinement(refinementId: string): KnowledgeRefinement | undefined {
    return this.refinements.get(refinementId);
  }

  /**
   * エンティティ別精緻化を取得
   */
  getRefinementsByEntity(entityId: string): KnowledgeRefinement[] {
    const ids = this.refinementsByEntity.get(entityId) || [];
    return ids
      .map(id => this.refinements.get(id))
      .filter((r): r is KnowledgeRefinement => r !== undefined);
  }

  /**
   * ステータス別精緻化を取得
   */
  getRefinementsByStatus(status: 'pending' | 'approved' | 'applied' | 'rejected'): KnowledgeRefinement[] {
    const ids = this.refinementsByStatus.get(status) || [];
    return ids
      .map(id => this.refinements.get(id))
      .filter((r): r is KnowledgeRefinement => r !== undefined);
  }

  /**
   * 精緻化を承認
   */
  approveRefinement(refinementId: string): boolean {
    const refinement = this.refinements.get(refinementId);
    if (!refinement) return false;

    const pendingIds = this.refinementsByStatus.get('pending') || [];
    const index = pendingIds.indexOf(refinementId);
    if (index > -1) {
      pendingIds.splice(index, 1);
    }

    refinement.status = 'approved';

    if (!this.refinementsByStatus.has('approved')) {
      this.refinementsByStatus.set('approved', []);
    }
    this.refinementsByStatus.get('approved')!.push(refinementId);

    return true;
  }

  /**
   * 精緻化を適用
   */
  applyRefinement(refinementId: string): boolean {
    const refinement = this.refinements.get(refinementId);
    if (!refinement) return false;

    const approvedIds = this.refinementsByStatus.get('approved') || [];
    const index = approvedIds.indexOf(refinementId);
    if (index > -1) {
      approvedIds.splice(index, 1);
    }

    refinement.status = 'applied';

    if (!this.refinementsByStatus.has('applied')) {
      this.refinementsByStatus.set('applied', []);
    }
    this.refinementsByStatus.get('applied')!.push(refinementId);

    // エンティティを更新
    const entity = this.entities.get(refinement.entityId);
    if (entity) {
      entity.description = refinement.refinedContent;
      entity.lastUpdated = Date.now();
    }

    return true;
  }

  /**
   * 全エンティティを取得
   */
  getAllEntities(): KnowledgeEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * 全関係を取得
   */
  getAllRelations(): KnowledgeRelation[] {
    return Array.from(this.relations.values());
  }

  /**
   * 全精緻化を取得
   */
  getAllRefinements(): KnowledgeRefinement[] {
    return Array.from(this.refinements.values());
  }

  /**
   * 知識品質統計を計算
   */
  getKnowledgeStats(): {
    totalEntities: number;
    activeEntities: number;
    averageConfidence: number;
    totalRelations: number;
    confirmedRelations: number;
    totalRefinements: number;
    appliedRefinements: number;
    averageImprovementScore: number;
  } {
    const allEntities = Array.from(this.entities.values());
    const allRelations = Array.from(this.relations.values());
    const allRefinements = Array.from(this.refinements.values());

    let totalConfidence = 0;
    let totalImprovement = 0;

    for (const entity of allEntities) {
      totalConfidence += entity.confidence;
    }

    for (const refinement of allRefinements) {
      totalImprovement += refinement.improvementScore;
    }

    return {
      totalEntities: allEntities.length,
      activeEntities: allEntities.filter(e => e.status === 'active').length,
      averageConfidence: allEntities.length > 0 ? totalConfidence / allEntities.length : 0,
      totalRelations: allRelations.length,
      confirmedRelations: allRelations.filter(r => r.status === 'confirmed').length,
      totalRefinements: allRefinements.length,
      appliedRefinements: allRefinements.filter(r => r.status === 'applied').length,
      averageImprovementScore: allRefinements.length > 0 ? totalImprovement / allRefinements.length : 0,
    };
  }

  /**
   * エンティティを削除
   */
  deleteEntity(entityId: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    const categoryIds = this.entitiesByCategory.get(entity.category) || [];
    const categoryIndex = categoryIds.indexOf(entityId);
    if (categoryIndex > -1) {
      categoryIds.splice(categoryIndex, 1);
    }

    const typeIds = this.entitiesByType.get(entity.type) || [];
    const typeIndex = typeIds.indexOf(entityId);
    if (typeIndex > -1) {
      typeIds.splice(typeIndex, 1);
    }

    this.entities.delete(entityId);
    return true;
  }

  /**
   * 関係を削除
   */
  deleteRelation(relationId: string): boolean {
    const relation = this.relations.get(relationId);
    if (!relation) return false;

    const sourceIds = this.relationsBySource.get(relation.sourceEntityId) || [];
    const sourceIndex = sourceIds.indexOf(relationId);
    if (sourceIndex > -1) {
      sourceIds.splice(sourceIndex, 1);
    }

    const targetIds = this.relationsByTarget.get(relation.targetEntityId) || [];
    const targetIndex = targetIds.indexOf(relationId);
    if (targetIndex > -1) {
      targetIds.splice(targetIndex, 1);
    }

    this.relations.delete(relationId);
    return true;
  }

  /**
   * 精緻化を削除
   */
  deleteRefinement(refinementId: string): boolean {
    const refinement = this.refinements.get(refinementId);
    if (!refinement) return false;

    const entityIds = this.refinementsByEntity.get(refinement.entityId) || [];
    const entityIndex = entityIds.indexOf(refinementId);
    if (entityIndex > -1) {
      entityIds.splice(entityIndex, 1);
    }

    const statusIds = this.refinementsByStatus.get(refinement.status) || [];
    const statusIndex = statusIds.indexOf(refinementId);
    if (statusIndex > -1) {
      statusIds.splice(statusIndex, 1);
    }

    this.refinements.delete(refinementId);
    return true;
  }
}
