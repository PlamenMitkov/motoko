"""
Модул за управление на данни за екопътеки

Този модул предоставя функционалност за търсене, филтриране и извличане
на информация за туристически маршрути и екопътеки от JSON база данни.

Автор: [Вашето име]
Дата: 2025
Версия: 1.0
"""

import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

# ============================================================================
# КОНФИГУРАЦИЯ И КОНСТАНТИ
# ============================================================================

# Път до файла с данни за екопътеките
DATA_FILE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'eco.json')

# Кеш за данните за подобряване на производителността
_data_cache = None
_cache_timestamp = None

# ============================================================================
# ОСНОВНИ ФУНКЦИИ ЗА ТЪРСЕНЕ И ИЗВЛИЧАНЕ НА ДАННИ
# ============================================================================

def search_trails(query: str) -> List[Dict[str, Any]]:
    """
    Търси екопътеки по ключова дума в различни полета на данните.
    
    Функцията извършва търсене без разлика на главни/малки букви в:
    - Имената на маршрутите
    - Описанията
    - Ключовите думи за местоположение
    - Регионите
    
    Args:
        query (str): Ключовата дума или фраза за търсене
    
    Returns:
        List[Dict[str, Any]]: Списък от маршрути отговарящи на критерия
    """
    # Валидация на входните данни
    if not query or not isinstance(query, str):
        return []
    
    # Нормализиране на заявката за търсене
    normalized_query = query.lower().strip()
    
    if not normalized_query:
        return []
    
    print(f"🔍 Търсене на маршрути за: '{query}'")
    
    # Зареждане на данните от файла
    trails_data = load_trail_data()
    matching_trails = []
    
    for trail in trails_data:
        # Пропускане на маршрути без валидни координати
        if not _has_valid_coordinates(trail):
            continue
        
        # Проверка в името на маршрута
        trail_name = trail.get('name', '').lower()
        if normalized_query in trail_name:
            matching_trails.append(trail)
            continue
        
        # Проверка в описанието
        trail_description = trail.get('description', '').lower()
        if normalized_query in trail_description:
            matching_trails.append(trail)
            continue
        
        # Проверка в региона
        region = trail.get('location', {}).get('region', '').lower()
        if normalized_query in region:
            matching_trails.append(trail)
            continue
        
        # Проверка в ключовите думи за местоположение
        location_keywords = trail.get('location', {}).get('keywords', [])
        if any(normalized_query in keyword.lower() for keyword in location_keywords):
            matching_trails.append(trail)
            continue
        
        # Проверка в детайлите за маршрута
        trail_details = trail.get('trail_details', {})
        difficulty = trail_details.get('difficulty', '').lower()
        if normalized_query in difficulty:
            matching_trails.append(trail)
            continue
    
    print(f"✅ Намерени {len(matching_trails)} маршрута за '{query}'")
    return matching_trails


def get_trail_by_id(trail_id: str) -> Optional[Dict[str, Any]]:
    """
    Извлича конкретен маршрут по неговия уникален идентификатор.
    
    Args:
        trail_id (str): Уникалният идентификатор на маршрута
    
    Returns:
        Optional[Dict[str, Any]]: Данните за маршрута или None ако не е намерен
    """
    # Валидация на входните данни
    if not trail_id or not isinstance(trail_id, str):
        print("❌ Невалиден ID за маршрут")
        return None
    
    print(f"🔍 Търсене на маршрут с ID: {trail_id}")
    
    # Зареждане на данните
    trails_data = load_trail_data()
    
    # Търсене на маршрута с точно съвпадащ ID
    for trail in trails_data:
        if trail.get('id') == trail_id:
            print(f"✅ Намерен маршрут: {trail.get('name', 'Неименован')}")
            return trail
    
    print(f"❌ Маршрут с ID '{trail_id}' не е намерен")
    return None


def list_all_trails() -> List[Dict[str, Any]]:
    """
    Връща всички налични екопътеки от базата данни.
    
    Returns:
        List[Dict[str, Any]]: Пълен списък с всички екопътеки
    """
    trails_data = load_trail_data()
    print(f"📋 Връщане на {len(trails_data)} общо маршрута")
    return trails_data


def advanced_search(
    region: Optional[str] = None,
    difficulty: Optional[str] = None,
    best_season: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Извършва разширено търсене на маршрути по множество критерии.
    
    Функцията филтрира маршрутите според предоставените критерии.
    Всички параметри са опционални - ако не са зададени, съответният
    филтър не се прилага.
    
    Args:
        region (Optional[str]): Регион за търсене (частично съвпадение)
        difficulty (Optional[str]): Ниво на трудност (частично съвпадение)
        best_season (Optional[str]): Най-подходящ сезон (точно съвпадение)
    
    Returns:
        List[Dict[str, Any]]: Списък от маршрути отговарящи на критериите
    """
    print(f"🔍 Разширено търсене: регион='{region}', трудност='{difficulty}', сезон='{best_season}'")
    
    # Зареждане на данните
    trails_data = load_trail_data()
    filtered_trails = []
    
    # Нормализиране на параметрите за търсене
    region_normalized = region.lower().strip() if region else None
    difficulty_normalized = difficulty.lower().strip() if difficulty else None
    season_normalized = best_season.strip() if best_season else None
    
    for trail in filtered_trails:
        # Флаг за проследяване дали маршрутът отговаря на всички критерии
        matches_criteria = True
        
        # Филтриране по регион
        if region_normalized:
            trail_region = trail.get('location', {}).get('region', '').lower()
            if region_normalized not in trail_region:
                matches_criteria = False
        
        # Филтриране по трудност
        if difficulty_normalized and matches_criteria:
            trail_difficulty = trail.get('trail_details', {}).get('difficulty', '').lower()
            if difficulty_normalized not in trail_difficulty:
                matches_criteria = False
        
        # Филтриране по сезон
        if season_normalized and matches_criteria:
            trail_seasons = trail.get('best_season', [])
            if not isinstance(trail_seasons, list):
                matches_criteria = False
            elif season_normalized not in trail_seasons:
                matches_criteria = False
        
        # Добавяне на маршрута ако отговаря на всички критерии
        if matches_criteria:
            filtered_trails.append(trail)
    
    print(f"✅ Намерени {len(filtered_trails)} маршрута при разширеното търсене")
    return filtered_trails

# ============================================================================
# ПОМОЩНИ ФУНКЦИИ ЗА РАБОТА С ДАННИ
# ============================================================================

def load_trail_data() -> List[Dict[str, Any]]:
    """
    Зарежда данните за екопътеките от JSON файла с кеширане.
    
    Функцията чете данните от JSON файла, валидира ги и използва
    кеширане за подобряване на производителността при многократни заявки.
    
    Returns:
        List[Dict[str, Any]]: Списък с всички валидни екопътеки от файла
    
    Raises:
        FileNotFoundError: Ако файлът с данни не съществува
        json.JSONDecodeError: При невалиден JSON формат
        ValueError: При невалидна структура на данните
    """
    global _data_cache, _cache_timestamp
    
    try:
        # Проверка дали файлът съществува
        if not os.path.exists(DATA_FILE_PATH):
            print(f"❌ Файлът с данни не е намерен: {DATA_FILE_PATH}")
            return []
        
        # Получаване на времето на последна промяна на файла
        file_modification_time = os.path.getmtime(DATA_FILE_PATH)
        
        # Използване на кеширани данни ако файлът не е променян
        if _data_cache is not None and _cache_timestamp == file_modification_time:
            return _data_cache
        
        print(f"📂 Зареждане на данни от: {DATA_FILE_PATH}")
        
        # Четене и парсване на JSON файла
        with open(DATA_FILE_PATH, encoding='utf-8') as file:
            raw_data = json.load(file)
        
        # Валидация на структурата на данните
        if not isinstance(raw_data, dict):
            raise ValueError("JSON файлът трябва да съдържа обект на най-високо ниво")
        
        eco_trails = raw_data.get('eco_trails')
        if not isinstance(eco_trails, list):
            raise ValueError("Полето 'eco_trails' трябва да бъде списък с маршрути")
        
        # Валидация и почистване на отделните маршрути
        validated_trails = []
        for index, trail in enumerate(eco_trails):
            if not isinstance(trail, dict):
                print(f"⚠️ Маршрут на позиция {index} не е валиден обект - пропускане")
                continue
            
            # Проверка за задължителни полета
            trail_id = trail.get('id')
            if not trail_id:
                print(f"⚠️ Маршрут на позиция {index} няма валиден ID - пропускане")
                continue
            
            trail_name = trail.get('name')
            if not trail_name:
                print(f"⚠️ Маршрут с ID {trail_id} няма име")
            
            # Добавяне на допълнителни метаданни
            trail['_loaded_at'] = datetime.now().isoformat()
            trail['_index'] = index
            
            validated_trails.append(trail)
        
        # Кеширане на валидираните данни
        _data_cache = validated_trails
        _cache_timestamp = file_modification_time
        
        print(f"✅ Успешно заредени {len(validated_trails)} от {len(eco_trails)} маршрута")
        return validated_trails
        
    except FileNotFoundError:
        print(f"❌ Файлът с данни не е намерен: {DATA_FILE_PATH}")
        return []
    
    except json.JSONDecodeError as e:
        print(f"❌ Грешка при парсване на JSON файла: {str(e)}")
        return []
    
    except ValueError as e:
        print(f"❌ Грешка в структурата на данните: {str(e)}")
        return []
    
    except Exception as e:
        print(f"❌ Неочаквана грешка при зареждане на данните: {str(e)}")
        return []


def _has_valid_coordinates(trail: Dict[str, Any]) -> bool:
    """
    Проверява дали маршрутът има валидни географски координати.
    
    Помощна функция която валидира наличието и формата на координатите
    в данните за маршрута.
    
    Args:
        trail (Dict[str, Any]): Данните за маршрута
    
    Returns:
        bool: True ако координатите са валидни, False в противен случай
    """
    try:
        # Извличане на информацията за местоположението
        location_info = trail.get('location', {})
        coordinates = location_info.get('coordinates', {})
        
        # Проверка дали координатите са в правилен формат
        if not isinstance(coordinates, dict):
            return False
        
        # Извличане на latitude и longitude
        latitude = coordinates.get('lat')
        longitude = coordinates.get('lng')
        
        # Проверка дали координатите са числа
        if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
            return False
        
        # Проверка на валидните граници за координати
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            return False
        
        return True
        
    except (AttributeError, TypeError, KeyError):
        return False


def clear_data_cache():
    """
    Изчиства кеша с данните за маршрутите.
    
    Полезна функция за принудително презареждане на данните от файла
    при следващата заявка. Използва се при актуализации на данните.
    """
    global _data_cache, _cache_timestamp
    _data_cache = None
    _cache_timestamp = None
    print("🗑️ Кешът с данни за маршрутите е изчистен")


def get_data_statistics() -> Dict[str, Any]:
    """
    Генерира статистическа информация за наличните маршрути.
    
    Създава обобщена информация за броя маршрути, разпределението
    по региони, нива на трудност и подходящи сезони.
    
    Returns:
        Dict[str, Any]: Статистическа информация за маршрутите
    """
    trails_data = load_trail_data()
    
    if not trails_data:
        return {
            'total_trails': 0,
            'regions': {},
            'difficulties': {},
            'seasons': {},
            'last_updated': None
        }
    
    # Инициализация на брояците
    region_counts = {}
    difficulty_counts = {}
    season_counts = {}
    
    for trail in trails_data:
        # Броене по региони
        region = trail.get('location', {}).get('region', 'Неизвестен регион')
        region_counts[region] = region_counts.get(region, 0) + 1
        
        # Броене по трудност
        difficulty = trail.get('trail_details', {}).get('difficulty', 'Неопределена трудност')
        difficulty_counts[difficulty] = difficulty_counts.get(difficulty, 0) + 1
        
        # Броене по сезони
        trail_seasons = trail.get('best_season', [])
        if isinstance(trail_seasons, list):
            for season in trail_seasons:
                season_counts[season] = season_counts.get(season, 0) + 1
    
    return {
        'total_trails': len(trails_data),
        'regions': region_counts,
        'difficulties': difficulty_counts,
        'seasons': season_counts,
        'last_updated': datetime.now().isoformat(),
        'cache_info': {
            'cached': _data_cache is not None,
            'cache_timestamp': _cache_timestamp
        }
    }


def validate_trail_data(trail: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Валидира данните за отделен маршрут.
    
    Проверява дали маршрутът съдържа всички необходими полета
    и дали данните са в правилен формат.
    
    Args:
        trail (Dict[str, Any]): Данните за маршрута за валидация
    
    Returns:
        Tuple[bool, List[str]]: Кортеж съдържащ:
            - bool: True ако данните са валидни
            - List[str]: Списък с грешки ако има такива
    """
    errors = []
    
    # Проверка за задължителни полета
    required_fields = ['id', 'name']
    for field in required_fields:
        if not trail.get(field):
            errors.append(f"Липсва задължителното поле: {field}")
    
    # Проверка на координатите
    if not _has_valid_coordinates(trail):
        errors.append("Невалидни или липсващи координати")
    
    # Проверка на структурата на данните
    location = trail.get('location', {})
    if not isinstance(location, dict):
        errors.append("Полето 'location' трябва да бъде обект")
    
    trail_details = trail.get('trail_details', {})
    if not isinstance(trail_details, dict):
        errors.append("Полето 'trail_details' трябва да бъде обект")
    
    # Проверка на сезоните
    seasons = trail.get('best_season', [])
    if not isinstance(seasons, list):
        errors.append("Полето 'best_season' трябва да бъде списък")
    
    return len(errors) == 0, errors

# ============================================================================
# ФУНКЦИИ ЗА ЕКСПОРТ И ИМПОРТ НА ДАННИ
# ============================================================================

def export_trails_to_json(output_path: str, trails: Optional[List[Dict[str, Any]]] = None) -> bool:
    """
    Експортира данни за маршрути в JSON файл.
    
    Args:
        output_path (str): Път до изходния файл
        trails (Optional[List[Dict[str, Any]]]): Маршрути за експорт (всички ако не е зададено)
    
    Returns:
        bool: True при успешен експорт, False при грешка
    """
    try:
        if trails is None:
            trails = load_trail_data()
        
        export_data = {
            'eco_trails': trails,
            'export_info': {
                'timestamp': datetime.now().isoformat(),
                'total_count': len(trails),
                'exported_by': 'EcoTrails System'
            }
        }
        
        with open(output_path, 'w', encoding='utf-8') as file:
            json.dump(export_data, file, ensure_ascii=False, indent=2)
        
        print(f"✅ Данните са експортирани успешно в: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Грешка при експорт: {str(e)}")
        return False


def get_trails_by_region(region: str) -> List[Dict[str, Any]]:
    """
    Връща всички маршрути от определен регион.
    
    Args:
        region (str): Името на региона
    
    Returns:
        List[Dict[str, Any]]: Списък с маршрути от региона
    """
    if not region:
        return []
    
    trails_data = load_trail_data()
    region_trails = []
    
    region_normalized = region.lower().strip()
    
    for trail in trails_data:
        trail_region = trail.get('location', {}).get('region', '').lower()
        if region_normalized in trail_region:
            region_trails.append(trail)
    
    print(f"🏔️ Намерени {len(region_trails)} маршрута в регион '{region}'")
    return region_trails
