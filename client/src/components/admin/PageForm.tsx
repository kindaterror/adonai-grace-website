// == IMPORTS & DEPENDENCIES ==
import React, { useState, useRef, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Upload, X, Image, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { motion, AnimatePresence } from 'framer-motion';

/** ================= Cloudinary helpers (Vite + Next-safe) ================= */
const cloud =
  ((typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined)
    ?.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ||
  ((typeof globalThis !== 'undefined'
    ? (globalThis as any).NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    : undefined) as string | undefined) ||
  ((typeof process !== 'undefined' ? (process as any).env : undefined)
    ?.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string | undefined) ||
  ((typeof process !== 'undefined' ? (process as any).env : undefined)
    ?.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ||
  '';

const clUrl = (publicId?: string, w = 800, h = 450) => {
  if (!publicId || !cloud) return '';
  return `https://res.cloudinary.com/${cloud}/image/upload/c_fill,w=${w},h=${h},q_auto,f_auto/${publicId}`;
};

// == TYPE DEFINITIONS ==
export interface Question {
  questionText: string;
  answerType: string;
  correctAnswer?: string;
  options?: string;
}

const pageSchema = z.object({
  pageNumber: z.coerce.number().min(1, 'Page number is required'),
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  imageUrl: z.string().optional(),
  imagePublicId: z.string().optional(),
});

export interface PageFormValues extends z.infer<typeof pageSchema> {
  id?: number;
  questions?: Question[];
  showNotification?: boolean;
}

interface PageFormProps {
  initialValues?: PageFormValues;
  pageNumber: number;
  onSave: (values: PageFormValues) => void;
  onRemove: () => void;
  showRemoveButton?: boolean;
}

// == Motion presets (UI-only) ==
const fadeCard = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};
const sectionFade = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};
const itemFade = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

// Autosave delays (ms)
const CONTENT_SAVE_DELAY_MS = 25000; // 25 seconds
const QUESTIONS_SAVE_DELAY_MS = 25000; // 25 seconds
const IMAGE_SAVE_DELAY_MS = 25000; // 25 seconds

// == PAGE FORM COMPONENT ==
export interface PageFormHandle {
  flush: () => PageFormValues;
}

export const PageForm = React.forwardRef<PageFormHandle | null, PageFormProps>(function PageForm(
  { initialValues, pageNumber, onSave, onRemove, showRemoveButton = true }: PageFormProps,
  ref
) {

  // == State & Refs ==
  const { toast } = useToast();
  const [hasQuestions, setHasQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(initialValues?.questions || []);
  const [imagePreview, setImagePreview] = useState<string | null>(initialValues?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastQuestionsChange, setLastQuestionsChange] = useState(0);
  const [lastImageChange, setLastImageChange] = useState(0);
  const saveTimeoutRef = useRef<number | null>(null);

  // == Effects ==
  useEffect(() => {
    if (initialValues?.questions && initialValues.questions.length > 0) {
      setQuestions(initialValues.questions);
      setHasQuestions(true);
    }
    const t = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(t);
  }, [initialValues?.questions]);

  // == Form Initialization ==
  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: initialValues || {
      pageNumber,
      title: '',
      content: '',
      imageUrl: '',
      imagePublicId: '',
    },
  });

  const lastAppliedInitialId = useRef<number | undefined>(initialValues?.id);
  const programmaticResetRef = useRef(false);

  useEffect(() => {
    const incomingId = initialValues?.id;
    if (incomingId === lastAppliedInitialId.current) return;
    if (hasUnsavedChanges) return;

    programmaticResetRef.current = true;
    form.reset(
      initialValues || {
        pageNumber,
        title: '',
        content: '',
        imageUrl: '',
        imagePublicId: '',
      }
    );
    setTimeout(() => { programmaticResetRef.current = false; }, 0);
    lastAppliedInitialId.current = incomingId;
  }, [initialValues, form, pageNumber, hasUnsavedChanges]);

  const cloudPublicId = form.watch('imagePublicId');
  const computedPreview = cloudPublicId ? clUrl(cloudPublicId) : imagePreview;

  // == Auto-Save: Content Changes ==
  useEffect(() => {
    const subscription = form.watch((values, { type }) => {
      if (programmaticResetRef.current) return;
      if (isInitialLoad) return;

      const currentValues = form.getValues();
      if (currentValues.content && currentValues.content.trim() && type === 'change') {
        setHasUnsavedChanges(true);

        const pageData: PageFormValues = {
          ...currentValues,
          content: currentValues.content ?? '',
          pageNumber,
          questions: questions.length > 0 ? questions : undefined,
          showNotification: false,
        };

        if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(() => {
          onSave(pageData);
          setHasUnsavedChanges(false);
          saveTimeoutRef.current = null;
        }, CONTENT_SAVE_DELAY_MS) as unknown as number;
      }
    });

    return () => subscription.unsubscribe();
  }, [form, pageNumber, questions, onSave, isInitialLoad, hasUnsavedChanges]);

  React.useImperativeHandle(ref, () => ({
    flush: () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      const currentValues = form.getValues();
      const pageData: PageFormValues = {
        ...currentValues,
        content: currentValues.content ?? '',
        pageNumber,
        questions: questions.length > 0 ? questions : undefined,
        showNotification: false,
      };

      try {
        onSave(pageData);
      } catch (e) {
        // ignore parent errors here
      }

      setHasUnsavedChanges(false);
      return pageData;
    }
  }), [form, onSave, pageNumber, questions]);

  // == Auto-Save: Question Changes ==
  useEffect(() => {
    if (isInitialLoad) return;

    const formValues = form.getValues();
    if (formValues.content && formValues.content.trim()) {
      setHasUnsavedChanges(true);

      const now = Date.now();
      const shouldShowNotification = now - lastQuestionsChange < 500;

      const pageData: PageFormValues = {
        ...formValues,
        content: formValues.content ?? '',
        pageNumber,
        questions: questions.length > 0 ? questions : undefined,
        showNotification: shouldShowNotification,
      };

      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(() => {
        onSave(pageData);
        setHasUnsavedChanges(false);
        saveTimeoutRef.current = null;
      }, QUESTIONS_SAVE_DELAY_MS) as unknown as number;
    }
  }, [questions, form, pageNumber, onSave, isInitialLoad, hasUnsavedChanges, lastQuestionsChange]);

  // == Image Handling ==
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size should be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || '';
      setImagePreview(dataUrl);
      form.setValue("imageUrl", dataUrl);
      setHasUnsavedChanges(true);
      setLastImageChange(Date.now());

      const formValues = form.getValues();
      const pageData: PageFormValues = {
        ...formValues,
        content: formValues.content ?? '',
        imageUrl: dataUrl,
        pageNumber,
        questions: questions.length > 0 ? questions : undefined,
        showNotification: true,
      };

      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(() => {
        onSave(pageData);
        setHasUnsavedChanges(false);
        saveTimeoutRef.current = null;
      }, IMAGE_SAVE_DELAY_MS) as unknown as number;
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    form.setValue("imageUrl", "");
    setHasUnsavedChanges(true);
    setLastImageChange(Date.now());

    const formValues = form.getValues();
    const pageData: PageFormValues = {
      ...formValues,
      content: formValues.content ?? '',
      imageUrl: "",
      pageNumber,
      questions: questions.length > 0 ? questions : undefined,
      showNotification: true,
    };

    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      onSave(pageData);
      setHasUnsavedChanges(false);
      saveTimeoutRef.current = null;
    }, 500) as unknown as number;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  // == Question Utilities ==
  const getOptionsList = (optionsString?: string): string[] => {
    if (!optionsString) return [];
    return optionsString.includes('\n')
      ? optionsString.split('\n').filter(opt => opt.trim() !== '')
      : optionsString.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
  };

  // == Question Management ==
  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionText: '', answerType: 'text', correctAnswer: '', options: '' }
    ]);
    setHasQuestions(true);
    setHasUnsavedChanges(true);
    setLastQuestionsChange(Date.now());
  };

  const removeQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
    setHasUnsavedChanges(true);
    setLastQuestionsChange(Date.now());
    if (updated.length === 0) setHasQuestions(false);
  };

  const updateQuestion = (index: number, field: keyof Question, value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'answerType' && value === 'multiple_choice') {
      const current = updated[index];
      const opts = getOptionsList(current.options);
      if (opts.length === 0) current.options = "Option 1\nOption 2\nOption 3";
    }

    setQuestions(updated);
    setHasUnsavedChanges(true);
    setLastQuestionsChange(Date.now());
  };

  // == Option Management ==
  const addOption = (qi: number) => {
    const q = questions[qi];
    const opts = getOptionsList(q.options || '');
    const optionsString = [...opts, `Option ${opts.length + 1}`].join('\n');
    updateQuestion(qi, 'options', optionsString);
  };

  const removeOption = (qi: number, oi: number) => {
    const q = questions[qi];
    const opts = getOptionsList(q.options);
    if (q.correctAnswer === opts[oi]) updateQuestion(qi, 'correctAnswer', '');
    const next = opts.slice(0, oi).concat(opts.slice(oi + 1)).join('\n');
    updateQuestion(qi, 'options', next);
  };

  const updateOptionText = (qi: number, oi: number, text: string) => {
    const q = questions[qi];
    const opts = getOptionsList(q.options);
    if (q.correctAnswer === opts[oi]) updateQuestion(qi, 'correctAnswer', text);
    opts[oi] = text;
    updateQuestion(qi, 'options', opts.join('\n'));
  };

  // == Render Component ==
  return (
    <motion.div
      variants={fadeCard}
      initial="hidden"
      animate="visible"
      className="border border-slate-200 bg-white rounded-2xl shadow-sm mb-5 overflow-hidden"
    >
      {/* == Page Header == */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 flex items-center">
            <Sparkles className="h-4 w-4 text-blue-600 mr-2" />
            📄 Page {pageNumber}
            {hasUnsavedChanges && !isInitialLoad && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-3 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium"
              >
                • Unsaved
              </motion.span>
            )}
          </h3>
          {showRemoveButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="bg-white text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-medium"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove Page
            </Button>
          )}
        </div>
      </div>

      {/* == Form Content == */}
      <div className="p-5 md:p-6">
        <Form {...form}>
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">

            {/* Hidden field for Cloudinary ID */}
            <FormField control={form.control} name="imagePublicId" render={({ field }) => (<input type="hidden" {...field} />)} />

            {/* === Top Grid: fields (2 cols) + image (1 col) === */}
            <motion.div variants={sectionFade} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {/* Left: fields */}
              <div className="md:col-span-2 flex flex-col gap-5 md:h-full">
                {/* Title */}
                <motion.div variants={itemFade}>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="!space-y-1.5">
                        <FormLabel className="text-slate-800 font-semibold">Page Title (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter a title for this page"
                            {...field}
                            value={field.value || ''}
                            className="border border-slate-200 focus:border-blue-500 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* Content */}
                <motion.div variants={itemFade} className="flex-1 flex flex-col">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem className="!space-y-1.5 flex-1 flex flex-col">
                        <FormLabel className="text-slate-800 font-semibold">Page Content</FormLabel>
                        <FormControl className="flex-1 flex">
                          <Textarea
                            placeholder="Enter the content for this page..."
                            {...field}
                            className="border border-slate-200 focus:border-blue-500 shadow-sm flex-1 h-full min-h-[260px] md:min-h-0 resize-vertical md:resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              </div>

              {/* Right: image panel */}
              <motion.div variants={itemFade} className="md:col-span-1 space-y-3">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-800 font-semibold">🖼️ Page Image</FormLabel>
                      <div className="space-y-3">
                        {/* Preview */}
                        <AnimatePresence initial={false} mode="popLayout">
                          {computedPreview ? (
                            <motion.div
                              key="img-preview"
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              className="relative w-full"
                            >
                              <div className="relative aspect-[3/4] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                <img
                                  src={computedPreview}
                                  alt="Page image preview"
                                  className="w-full h-full object-cover"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-sm bg-rose-500 hover:bg-rose-600"
                                  onClick={clearImage}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="img-drop"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                              <Image className="h-6 w-6 text-slate-400 mb-2" />
                              <p className="text-sm text-slate-500 font-medium mb-3 text-center">Upload an image for this page</p>
                              <div className="flex items-center space-x-2">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleImageUpload}
                                  id={`image-upload-${pageNumber}`}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border border-slate-300 text-slate-700 hover:bg-white font-medium shadow-sm"
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  <Upload className="h-4 w-4 mr-2 text-slate-500" />
                                  Choose Image
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* URL input */}
                        <div className="relative pt-1">
                          <FormControl>
                            <Input
                              placeholder="Or enter image URL"
                              {...field}
                              value={field.value || ''}
                              className="border border-slate-200 focus:border-blue-500 shadow-sm"
                              onChange={(e) => {
                                field.onChange(e);
                                setLastImageChange(Date.now());
                              }}
                            />
                          </FormControl>
                          <FormDescription className="text-slate-500 text-xs mt-1.5 font-medium">
                            You can upload OR paste a URL
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>
            </motion.div>

            {/* == Questions Section == */}
            <motion.div variants={sectionFade} className="pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  ❓ Questions
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                  className="border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-transform hover:-translate-y-0.5 shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1 text-slate-500" />
                  Add Question
                </Button>
              </div>

              <AnimatePresence initial={false}>
                {questions.map((question, index) => (
                  <motion.div
                    key={index}
                    variants={itemFade}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="p-5 border border-slate-200 rounded-xl mb-4 bg-slate-50 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-base font-bold text-slate-800">❓ Question {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        className="h-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-800 font-semibold">Question Text</Label>
                        <Textarea
                          value={question.questionText}
                          onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                          placeholder="Enter your question here..."
                          className="mt-1.5 border border-slate-200 focus:border-blue-500 shadow-sm"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label className="text-slate-800 font-semibold">Answer Type</Label>
                        <select
                          value={question.answerType}
                          onChange={(e) => updateQuestion(index, 'answerType', e.target.value)}
                          className="w-full mt-1.5 p-2 border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-slate-800 bg-white shadow-sm"
                        >
                          <option value="text">✍️ Text</option>
                          <option value="multiple_choice">🔘 Multiple Choice</option>
                        </select>
                      </div>

                      <AnimatePresence initial={false} mode="popLayout">
                        {question.answerType === 'text' && (
                          <motion.div
                            key={`text-${index}`}
                            variants={itemFade}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <Label className="text-slate-800 font-semibold">Correct Answer</Label>
                            <Input
                              value={question.correctAnswer || ''}
                              onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                              placeholder="Enter the correct answer"
                              className="mt-1.5 border border-slate-200 focus:border-blue-500 shadow-sm"
                            />
                          </motion.div>
                        )}

                        {question.answerType === 'multiple_choice' && (
                          <motion.div
                            key={`mc-${index}`}
                            variants={itemFade}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <Label className="text-slate-800 font-semibold">Options</Label>
                            <div className="border border-slate-200 rounded-xl mt-1.5 bg-white overflow-hidden shadow-sm">
                              {getOptionsList(question.options).map((option, optionIdx) => (
                                <div key={optionIdx} className="flex items-center p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors">
                                  <input
                                    type="radio"
                                    id={`question-${index}-option-${optionIdx}`}
                                    name={`question-${index}-correct`}
                                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                                    checked={question.correctAnswer === option}
                                    onChange={() => updateQuestion(index, 'correctAnswer', option)}
                                  />
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => updateOptionText(index, optionIdx, e.target.value)}
                                    className="flex-1 border-0 focus:ring-0 p-1 font-medium text-slate-800 bg-transparent"
                                    placeholder={`Option ${optionIdx + 1}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 ml-2"
                                    onClick={() => removeOption(index, optionIdx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}

                              <div className="p-3 bg-slate-50 border-t border-slate-100">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addOption(index)}
                                  className="w-full justify-center border border-dashed border-slate-300 text-slate-600 hover:bg-white font-medium"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Option
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 font-medium">
                              Select the radio button next to the correct answer
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {questions.length === 0 && (
                <motion.p
                  variants={itemFade}
                  initial="hidden"
                  animate="visible"
                  className="text-sm text-slate-500 font-medium text-center p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm"
                >
                  No questions added yet. Click 'Add Question' to add interactive questions to this page.
                </motion.p>
              )}
            </motion.div>

            {/* == Auto-Save Status == */}
            <motion.div variants={sectionFade} className="pt-2">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center shadow-sm">
                <p className="text-sm text-blue-800 font-medium flex items-center justify-center">
                  <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
                  ✨ Changes save automatically. Click "Save Changes" at the bottom to update the book.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </Form>
      </div>
    </motion.div>
  );
});