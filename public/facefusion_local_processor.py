#!/usr/bin/env python3
"""
FaceFusion v3.6.1 ローカル処理スクリプト
高品質な顔入れ替え動画生成ツール

使用方法:
    python3 facefusion_local_processor.py \\
        --source source.jpg \\
        --target target.mp4 \\
        --output result.mp4 \\
        [--quality 18] \\
        [--model inswapper_128]

要件:
    - FaceFusion v3.6.1
    - Python 3.8+
    - GPU (推奨: NVIDIA RTX 2060以上)
"""

import argparse
import subprocess
import sys
import os
import json
from pathlib import Path
from typing import Optional, Dict, Any

# FaceFusion のデフォルトインストールパス
FACEFUSION_PATHS = [
    os.path.expanduser('~/facefusion'),
    '/opt/facefusion',
    '/usr/local/facefusion',
    os.path.join(os.path.dirname(__file__), 'facefusion'),
]


class FaceFusionProcessor:
    """FaceFusion v3.6.1 ローカル処理エンジン"""

    def __init__(self, facefusion_path: Optional[str] = None):
        """
        初期化

        Args:
            facefusion_path: FaceFusionのインストールパス
        """
        self.facefusion_path = self._find_facefusion(facefusion_path)
        if not self.facefusion_path:
            raise RuntimeError(
                'FaceFusionが見つかりません。以下のいずれかを実行してください:\n'
                '1. git clone https://github.com/facefusion/facefusion.git ~/facefusion\n'
                '2. --facefusion-path で明示的にパスを指定'
            )
        
        self.python_path = sys.executable
        self.facefusion_script = os.path.join(self.facefusion_path, 'facefusion.py')
        
        if not os.path.exists(self.facefusion_script):
            raise RuntimeError(f'FaceFusion スクリプトが見つかりません: {self.facefusion_script}')

    @staticmethod
    def _find_facefusion(custom_path: Optional[str] = None) -> Optional[str]:
        """FaceFusionのインストールパスを検索"""
        if custom_path and os.path.exists(custom_path):
            return custom_path
        
        for path in FACEFUSION_PATHS:
            if os.path.exists(path):
                return path
        
        return None

    def validate_inputs(self, source: str, target: str, output: str) -> bool:
        """入力ファイルを検証"""
        if not os.path.exists(source):
            print(f'❌ エラー: ソース画像が見つかりません: {source}')
            return False
        
        if not os.path.exists(target):
            print(f'❌ エラー: ターゲット動画が見つかりません: {target}')
            return False
        
        # 出力ディレクトリを作成
        output_dir = os.path.dirname(output)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        
        return True

    def process(
        self,
        source: str,
        target: str,
        output: str,
        quality: int = 18,
        model: str = 'inswapper_128',
        **kwargs
    ) -> bool:
        """
        顔入れ替え処理を実行

        Args:
            source: ソース画像パス
            target: ターゲット動画パス
            output: 出力動画パス
            quality: 出力品質 (0-51, 低いほど高品質)
            model: 顔入れ替えモデル
            **kwargs: その他のオプション

        Returns:
            処理成功時 True
        """
        # 入力検証
        if not self.validate_inputs(source, target, output):
            return False

        # コマンド構築
        cmd = [
            self.python_path,
            self.facefusion_script,
            'headless-run',
            '--source-paths', source,
            '--target-path', target,
            '--output-path', output,
            '--face-swapper-model', model,
            '--processors', 'face_swapper',
            '--output-video-encoder', 'libx264',
            '--output-video-preset', 'fast',
            '--output-video-quality', str(quality),
        ]

        # 追加オプション
        if 'face_mask_type' in kwargs:
            cmd.extend(['--face-mask-types', kwargs['face_mask_type']])
        
        if 'face_mask_areas' in kwargs:
            cmd.extend(['--face-mask-areas', str(kwargs['face_mask_areas'])])

        # メモリ最適化オプション
        cmd.extend([
            '--video-memory-strategy', 'strict',
            '--execution-thread-count', '2',
        ])

        print(f'🚀 FaceFusion 処理を開始します...')
        print(f'📷 ソース: {source}')
        print(f'🎬 ターゲット: {target}')
        print(f'💾 出力: {output}')
        print(f'⚙️  モデル: {model}')
        print(f'📊 品質: {quality}')
        print()

        try:
            # プロセス実行
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
            )

            # 出力をリアルタイムで表示
            for line in process.stdout:
                print(line.rstrip())

            # 終了を待機
            return_code = process.wait()

            if return_code == 0:
                print()
                print('✅ 処理が完了しました!')
                print(f'📁 出力ファイル: {output}')
                
                # ファイルサイズを表示
                if os.path.exists(output):
                    size_mb = os.path.getsize(output) / (1024 * 1024)
                    print(f'📊 ファイルサイズ: {size_mb:.2f} MB')
                
                return True
            else:
                print()
                print(f'❌ エラー: プロセスが失敗しました (終了コード: {return_code})')
                return False

        except KeyboardInterrupt:
            print()
            print('⚠️  ユーザーにより中断されました')
            process.terminate()
            return False
        except Exception as e:
            print(f'❌ エラー: {str(e)}')
            return False

    def get_info(self) -> Dict[str, Any]:
        """FaceFusionのバージョン情報を取得"""
        try:
            result = subprocess.run(
                [self.python_path, self.facefusion_script, '--version'],
                capture_output=True,
                text=True,
                timeout=10,
            )
            return {
                'installed': True,
                'path': self.facefusion_path,
                'version': result.stdout.strip() if result.returncode == 0 else 'unknown',
            }
        except Exception as e:
            return {
                'installed': False,
                'path': self.facefusion_path,
                'error': str(e),
            }


def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(
        description='FaceFusion v3.6.1 ローカル処理スクリプト',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
例:
  python3 facefusion_local_processor.py \\
    --source source.jpg \\
    --target target.mp4 \\
    --output result.mp4

  python3 facefusion_local_processor.py \\
    --source source.jpg \\
    --target target.mp4 \\
    --output result.mp4 \\
    --quality 18 \\
    --model inswapper_128

サポートされているモデル:
  - inswapper_128 (推奨)
  - simswap_256
  - blendswap_256
  - ghost_1_256
  - ghost_2_256
  - ghost_3_256
        '''
    )

    parser.add_argument(
        '--source',
        type=str,
        required=True,
        help='ソース画像ファイルパス',
    )
    parser.add_argument(
        '--target',
        type=str,
        required=True,
        help='ターゲット動画ファイルパス',
    )
    parser.add_argument(
        '--output',
        type=str,
        required=True,
        help='出力動画ファイルパス',
    )
    parser.add_argument(
        '--quality',
        type=int,
        default=18,
        help='出力品質 (0-51, デフォルト: 18)',
    )
    parser.add_argument(
        '--model',
        type=str,
        default='inswapper_128',
        help='顔入れ替えモデル (デフォルト: inswapper_128)',
    )
    parser.add_argument(
        '--facefusion-path',
        type=str,
        help='FaceFusionのインストールパス',
    )
    parser.add_argument(
        '--info',
        action='store_true',
        help='FaceFusionの情報を表示して終了',
    )

    args = parser.parse_args()

    try:
        processor = FaceFusionProcessor(args.facefusion_path)

        if args.info:
            info = processor.get_info()
            print(json.dumps(info, indent=2, ensure_ascii=False))
            return 0

        # 処理実行
        success = processor.process(
            source=args.source,
            target=args.target,
            output=args.output,
            quality=args.quality,
            model=args.model,
        )

        return 0 if success else 1

    except Exception as e:
        print(f'❌ エラー: {str(e)}')
        return 1


if __name__ == '__main__':
    sys.exit(main())
